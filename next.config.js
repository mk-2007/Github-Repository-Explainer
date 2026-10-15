/** @type {import('next').NextConfig} */
   const nextConfig = {
     serverExternalPackages: [
       "tree-sitter",
       "tree-sitter-javascript",
       "tree-sitter-typescript",
       "tree-sitter-python",
     ],
   };

   module.exports = nextConfig;