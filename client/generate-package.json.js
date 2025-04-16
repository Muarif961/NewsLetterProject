import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to scan for import/require statements
function scanForDependencies(directory) {
    const dependencies = new Set();
    const packagePattern =
        /(?:import\s+.*?from\s+['"]([^./][^'"]+)['"])|(?:require\s*\(\s*['"]([^./][^'"]+)['"]\s*\))/g;

    function scanFile(filePath) {
        const content = fs.readFileSync(filePath, "utf8");
        let match;
        while ((match = packagePattern.exec(content)) !== null) {
            const pkg = match[1] || match[2];
            // Get the base package name (remove subpaths)
            const basePkg = pkg.split("/")[0];
            // Skip React internal packages
            if (!basePkg.startsWith("@types")) {
                dependencies.add(basePkg);
            }
        }
    }

    function scanDirectory(dir) {
        const files = fs.readdirSync(dir);

        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);

            if (
                stat.isDirectory() &&
                !file.includes("node_modules") &&
                file !== "build" &&
                file !== "dist"
            ) {
                scanDirectory(filePath);
            } else if (stat.isFile() && /\.(js|jsx|ts|tsx)$/.test(file)) {
                scanFile(filePath);
            }
        }
    }

    scanDirectory(directory);
    return Array.from(dependencies);
}

// Generate package.json
function generatePackageJson(projectDir) {
    const dependencies = scanForDependencies(projectDir);

    const packageJson = {
        name: path.basename(projectDir),
        version: "1.0.0",
        private: true,
        type: "module", // Added for ES modules
        dependencies: {},
        scripts: {
            start: "react-scripts start",
            build: "react-scripts build",
            test: "react-scripts test",
            eject: "react-scripts eject",
        },
        eslintConfig: {
            extends: ["react-app", "react-app/jest"],
        },
        browserslist: {
            production: [">0.2%", "not dead", "not op_mini all"],
            development: [
                "last 1 chrome version",
                "last 1 firefox version",
                "last 1 safari version",
            ],
        },
    };

    // Save the package.json
    const outputPath = path.join(projectDir, "package.json");
    fs.writeFileSync(outputPath, JSON.stringify(packageJson, null, 2));

    console.log(
        "Generated package.json with these dependencies:",
        dependencies,
    );
    console.log("\nNext steps:");
    console.log("1. Run: npm install");
    console.log("2. For each dependency, run: npm install <package-name>");
    console.log(
        "3. If any versions are incorrect, modify them in package.json",
    );

    return dependencies;
}

// Usage
const projectDir = process.argv[2] || ".";
generatePackageJson(projectDir);
