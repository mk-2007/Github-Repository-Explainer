import Parser from "tree-sitter";
import JavaScript from "tree-sitter-javascript";
import TypeScript from "tree-sitter-typescript";
import Python from "tree-sitter-python";

/**
 * Static analysis pass. Runs BEFORE any LLM call — this is what makes the
 * free Groq tier survivable, since the dependency graph and module
 * boundaries come from parsing, not from asking a model to "figure out
 * the architecture" over raw source.
 */

export interface ParsedModule {
  path: string;
  language: string | null;
  imports: string[]; // raw import specifiers, resolved later against the file set
  exports: string[];
  loc: number;
}

const LANGUAGE_BY_EXT: Record<string, { grammar: any; name: string }> = {
  ".js": { grammar: JavaScript, name: "javascript" },
  ".jsx": { grammar: JavaScript, name: "javascript" },
  ".mjs": { grammar: JavaScript, name: "javascript" },
  ".ts": { grammar: TypeScript.typescript, name: "typescript" },
  ".tsx": { grammar: TypeScript.tsx, name: "typescript" },
  ".py": { grammar: Python, name: "python" },
};

function extOf(path: string): string {
  const idx = path.lastIndexOf(".");
  return idx === -1 ? "" : path.slice(idx);
}

function extractJsImportsExports(root: Parser.SyntaxNode) {
  const imports: string[] = [];
  const exports: string[] = [];

  function walk(node: Parser.SyntaxNode) {
    if (node.type === "import_statement" || node.type === "import") {
      const src = node.namedChildren.find((c) => c.type === "string");
      if (src) imports.push(src.text.replace(/['"]/g, ""));
    }
    if (node.type === "call_expression") {
      // Edge case: CommonJS `require("...")` alongside ES imports —
      // common in real-world JS repos that mix module styles.
      const fn = node.firstNamedChild;
      if (fn?.text === "require") {
        const arg = node.namedChildren[1]?.firstNamedChild;
        if (arg?.type === "string") imports.push(arg.text.replace(/['"]/g, ""));
      }
    }
    if (
      node.type === "export_statement" ||
      node.type === "export_specifier" ||
      node.type === "export_clause"
    ) {
      exports.push(node.text.slice(0, 80)); // trimmed, this is a coarse signal not a full export map
    }
    for (const child of node.namedChildren) walk(child);
  }

  walk(root);
  return { imports, exports };
}

function extractPyImports(root: Parser.SyntaxNode) {
  const imports: string[] = [];

  function walk(node: Parser.SyntaxNode) {
    if (node.type === "import_statement" || node.type === "import_from_statement") {
      const moduleName = node.namedChildren.find(
        (c) => c.type === "dotted_name" || c.type === "relative_import"
      );
      if (moduleName) imports.push(moduleName.text);
    }
    for (const child of node.namedChildren) walk(child);
  }

  walk(root);
  return { imports, exports: [] as string[] }; // Python has no static export list — resolved at import time
}

export function parseFile(path: string, content: string): ParsedModule {
  const loc = content.split("\n").length;
  const ext = extOf(path);
  const lang = LANGUAGE_BY_EXT[ext];

  if (!lang) {
    // Edge case: unsupported/unknown language (e.g. .go, .rs, .rb, config
    // files). We don't fail the run — the file still gets an LLM summary
    // pass later based on raw content, it just won't contribute edges to
    // the dependency graph.
    return { path, language: null, imports: [], exports: [], loc };
  }

  try {
    const parser = new Parser();
    parser.setLanguage(lang.grammar);
    const tree = parser.parse(content);

    const { imports, exports } =
      lang.name === "python"
        ? extractPyImports(tree.rootNode)
        : extractJsImportsExports(tree.rootNode);

    return { path, language: lang.name, imports, exports, loc };
  } catch (err) {
    // Edge case: malformed/unparseable source (e.g. a generated file with
    // syntax tree-sitter chokes on). Degrade gracefully rather than
    // failing the whole analysis run over one bad file.
    return { path, language: lang.name, imports: [], exports: [], loc };
  }
}
