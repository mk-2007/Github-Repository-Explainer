FROM node:20-bookworm

# python3 + build-essential equivalent for native module builds
# (tree-sitter needs these regardless of OS — Docker just isolates them
# inside the container instead of touching the host machine at all)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
