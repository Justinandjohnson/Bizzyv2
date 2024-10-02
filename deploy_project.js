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
    return execSync(command, { encoding: "utf8" });
  } catch (error) {
    console.error(`Failed to execute ${command}`, error);
    return null;
  }
};

const question = (query) =>
  new Promise((resolve) => rl.question(query, resolve));

async function deployProject() {
  console.log("Starting deployment process");

  // Check current git remote
  const remoteUrl = runCommand("git config --get remote.origin.url");
  if (remoteUrl) {
    console.log(`Current repository: ${remoteUrl.trim()}`);
    const confirmRepo = await question(
      "Is this the correct repository? (yes/no): "
    );
    if (confirmRepo.toLowerCase() !== "yes") {
      console.log(
        "Please navigate to the correct repository directory and run the script again."
      );
      return;
    }
  } else {
    console.log("No git remote found.");
    const createNew = await question(
      "Do you want to create a new GitHub repository? (yes/no): "
    );
    if (createNew.toLowerCase() === "yes") {
      const repoName = await question(
        "Enter the name for your new GitHub repository: "
      );
      console.log("Creating GitHub repository...");
      if (
        !runCommand(
          `gh repo create ${repoName} --public --source=. --remote=origin`
        )
      ) {
        console.error("Failed to create GitHub repository");
        return;
      }
    } else {
      console.log(
        "Cannot proceed without a git remote. Please set up your repository and try again."
      );
      return;
    }
  }

  // Git operations
  console.log("Committing changes...");
  runCommand("git add .");
  runCommand('git commit -m "Update for deployment"');

  // Get current branch name
  const currentBranch = runCommand("git rev-parse --abbrev-ref HEAD").trim();
  console.log(`Current branch: ${currentBranch}`);

  console.log("Pushing to GitHub...");
  if (!runCommand(`git push --set-upstream origin ${currentBranch}`)) {
    console.error("Failed to push to GitHub");
    return;
  }

  // Install Vercel CLI locally
  console.log("Installing Vercel CLI locally...");
  if (!runCommand("npm install --save-dev vercel")) {
    console.error("Failed to install Vercel CLI locally");
    return;
  }

  // Deploy to Vercel
  console.log("Deploying to Vercel...");
  console.log("You may be prompted to log in or confirm deployment settings.");
  if (!runCommand("npx vercel --prod")) {
    console.error("Failed to deploy to Vercel");
    return;
  }

  console.log("Deployment successful!");
  console.log(
    "Please set up your environment variables in the Vercel dashboard if you haven't already."
  );
  console.log("Update your frontend API URL to use the Vercel-provided URL.");

  rl.close();
}

console.log("Calling deployProject function");
deployProject().catch((error) => {
  console.error("An error occurred:", error);
  rl.close();
});
