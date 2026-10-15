import Parser from "tree-sitter";
import JavaScript from "tree-sitter-javascript";
import TypeScript from "tree-sitter-typescript";
import Python from "tree-sitter-python";

/**
 * Static analysis pass. Runs BEFORE any LLM call — extracts AST module
 * boundaries, imports, exports, and language info deterministically.
 */

export interface ParsedModule {
  path: string;
  language: string | null;
  imports: string[]; // raw import specifiers, resolved later against the file set
  exports: string[];
  loc: number;
  isEntryPoint?: boolean;
}

const LANGUAGE_BY_EXT: Record<string, { grammar: any; name: string }> = {
  ".js": { grammar: JavaScript, name: "javascript" },
  ".jsx": { grammar: JavaScript, name: "javascript" },
  ".mjs": { grammar: JavaScript, name: "javascript" },
  ".cjs": { grammar: JavaScript, name: "javascript" },
  ".ts": { grammar: TypeScript.typescript, name: "typescript" },
  ".tsx": { grammar: TypeScript.tsx, name: "typescript" },
  ".py": { grammar: Python, name: "python" },
};

export function isEntryPoint(filePath: string): boolean {
  const norm = filePath.toLowerCase().replace(/\\/g, "/");
  return (
    norm === "index.ts" ||
    norm === "index.js" ||
    norm === "main.py" ||
    norm === "app.py" ||
    norm === "src/index.ts" ||
    norm === "src/index.js" ||
    norm === "src/main.ts" ||
    norm.endsWith("/page.tsx") ||
    norm.endsWith("/main.py") ||
    norm.endsWith("/app.py") ||
    norm.endsWith("/cli.ts") ||
    norm.endsWith("/server.ts") ||
    norm.endsWith("/server.js")
  );
}

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
      exports.push(node.text.slice(0, 80));
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
  return { imports, exports: [] as string[] };
}

function extractJsonManifest(path: string, content: string): ParsedModule {
  const loc = content.split("\n").length;
  try {
    const data = JSON.parse(content);
    const imports: string[] = [];
    const exports: string[] = [];

    if (data.name) exports.push(`pkg:${data.name}`);
    if (data.dependencies) imports.push(...Object.keys(data.dependencies));
    if (data.devDependencies) imports.push(...Object.keys(data.devDependencies));

    return {
      path,
      language: "json",
      imports,
      exports,
      loc,
      isEntryPoint: false,
    };
  } catch {
    return { path, language: "json", imports: [], exports: [], loc, isEntryPoint: false };
  }
}

export function parseFile(path: string, content: string): ParsedModule {
  const loc = content.split("\n").length;
  const ext = extOf(path);

  if (path.endsWith("package.json")) {
    return extractJsonManifest(path, content);
  }

  const lang = LANGUAGE_BY_EXT[ext];

  if (!lang) {
    return {
      path,
      language: null,
      imports: [],
      exports: [],
      loc,
      isEntryPoint: isEntryPoint(path),
    };
  }

  try {
    const parser = new Parser();
    parser.setLanguage(lang.grammar);
    const tree = parser.parse(content);

    const { imports, exports } =
      lang.name === "python"
        ? extractPyImports(tree.rootNode)
        : extractJsImportsExports(tree.rootNode);

    return {
      path,
      language: lang.name,
      imports,
      exports,
      loc,
      isEntryPoint: isEntryPoint(path),
    };
  } catch {
    return {
      path,
      language: lang.name,
      imports: [],
      exports: [],
      loc,
      isEntryPoint: isEntryPoint(path),
    };
  }
}
