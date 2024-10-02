import { execSync } from "child_process";
import fs from "fs";
import readline from "readline";

console.log("Script started");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const runCommand = (command) => {
  console.log(`Executing command: ${command}`);
  try {
    execSync(command, { stdio: "inherit" });
  } catch (error) {
    console.error(`Failed to execute ${command}`, error);
    return false;
  }
  return true;
};

const question = (query) =>
  new Promise((resolve) => rl.question(query, resolve));

async function deployProject() {
  console.log("Starting deployment process");

  // Step 1: Ensure .env is in .gitignore
  if (!fs.existsSync(".gitignore")) {
    fs.writeFileSync(".gitignore", ".env\n");
  } else {
    const gitignore = fs.readFileSync(".gitignore", "utf8");
    if (!gitignore.includes(".env")) {
      fs.appendFileSync(".gitignore", "\n.env\n");
    }
  }

  // Step 2: Initialize git repository if not already initialized
  if (!fs.existsSync(".git")) {
    console.log("Initializing git repository...");
    runCommand("git init");
  }

  // Step 3: Create GitHub repository
  const repoName = await question(
    "Enter the name for your GitHub repository: "
  );
  console.log("Creating GitHub repository...");
  runCommand(`gh repo create ${repoName} --public --source=. --remote=origin`);

  // Step 4: Update package.json
  console.log("Updating package.json...");
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
  packageJson.scripts = {
    ...packageJson.scripts,
    "vercel-build": "npm run build",
  };
  fs.writeFileSync("package.json", JSON.stringify(packageJson, null, 2));

  // Step 5: Commit changes
  console.log("Committing changes...");
  runCommand("git add .");
  runCommand('git commit -m "Initial commit"');

  // Step 6: Push to GitHub
  console.log("Pushing to GitHub...");
  runCommand("git push -u origin main");

  // Step 7: Install Vercel CLI
  console.log("Installing Vercel CLI...");
  runCommand("npm install -g vercel");

  // Step 8: Deploy to Vercel
  console.log("Deploying to Vercel...");
  runCommand("vercel --prod");

  console.log("Deployment successful!");
  console.log(
    "Please set up your environment variables in the Vercel dashboard."
  );
  console.log("Update your frontend API URL to use the Vercel-provided URL.");

  rl.close();
}

console.log("Calling deployProject function");
deployProject().catch((error) => {
  console.error("An error occurred:", error);
  rl.close();
});
