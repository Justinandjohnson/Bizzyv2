import { spawn } from "child_process";
import fs from "fs";
import readline from "readline";

console.log("Script started");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const runCommand = (command, args = []) => {
  return new Promise((resolve, reject) => {
    const quotedArgs = args.map((arg) =>
      arg.includes(" ") ? `"${arg}"` : arg
    );
    console.log(`Executing command: ${command} ${quotedArgs.join(" ")}`);
    const process = spawn(command, quotedArgs, { stdio: "pipe", shell: true });

    let output = "";
    let progressIndicator;

    process.stdout.on("data", (data) => {
      output += data.toString();
      console.log(data.toString());
    });

    process.stderr.on("data", (data) => {
      console.error(data.toString());
    });

    // Start progress indicator for long-running commands
    if (command === "git" && args[0] === "push") {
      progressIndicator = setInterval(() => {
        process.stdout.write(".");
      }, 1000);
    }

    process.on("close", (code) => {
      if (progressIndicator) {
        clearInterval(progressIndicator);
        console.log("\n"); // New line after progress dots
      }
      if (code === 0) {
        resolve(output.trim());
      } else {
        console.error(`Command failed with code ${code}`);
        reject(new Error(`Command failed with code ${code}`));
      }
    });
  });
};

const question = (query) =>
  new Promise((resolve) => rl.question(query, resolve));

async function getLatestRepos() {
  try {
    const output = await runCommand("gh", [
      "repo",
      "list",
      "--limit",
      "3",
      "--json",
      "name,url",
    ]);
    return JSON.parse(output);
  } catch (error) {
    console.error("Failed to fetch repositories:", error);
    return null;
  }
}

async function deployProject() {
  console.log("Starting deployment process");

  try {
    const repos = await getLatestRepos();
    if (!repos) {
      console.log(
        "Failed to fetch repositories. Please ensure you're logged in to GitHub CLI."
      );
      return;
    }

    console.log("Your latest 3 repositories:");
    repos.forEach((repo, index) => {
      console.log(`${index + 1}. ${repo.name} (${repo.url})`);
    });

    const choice = await question(
      "Enter the number of the repository you want to update (or 'n' for a new repo): "
    );

    let remoteUrl;
    if (choice.toLowerCase() === "n") {
      const repoName = await question(
        "Enter the name for your new GitHub repository: "
      );
      console.log("Creating GitHub repository...");
      await runCommand("gh", [
        "repo",
        "create",
        repoName,
        "--public",
        "--source=.",
        "--remote=origin",
      ]);
      remoteUrl = `https://github.com/${await runCommand("gh", [
        "api",
        "user",
        "--jq",
        ".login",
      ])}/${repoName}.git`;
    } else {
      const index = parseInt(choice) - 1;
      if (isNaN(index) || index < 0 || index >= repos.length) {
        console.log("Invalid choice. Exiting.");
        return;
      }
      remoteUrl = repos[index].url;
      await runCommand("git", ["remote", "set-url", "origin", remoteUrl]);
    }

    console.log(`Using repository: ${remoteUrl}`);

    // Git operations
    console.log("Checking for changes...");
    const status = await runCommand("git", ["status", "--porcelain"]);

    if (status) {
      console.log("Changes detected. Committing...");
      await runCommand("git", ["add", "."]);
      await runCommand("git", ["commit", "-m", "Update for deployment"]);
    } else {
      console.log("No changes detected. Skipping commit.");
    }

    // Get current branch name
    const currentBranch = await runCommand("git", [
      "rev-parse",
      "--abbrev-ref",
      "HEAD",
    ]);
    console.log(`Current branch: ${currentBranch}`);

    console.log("Pushing to GitHub...");
    await runCommand("git", [
      "push",
      "--set-upstream",
      "origin",
      currentBranch,
    ]);

    // Install Vercel CLI locally
    console.log("Installing Vercel CLI locally...");
    await runCommand("npm", ["install", "--save-dev", "vercel"]);

    // Deploy to Vercel
    console.log("Deploying to Vercel...");
    console.log(
      "You may be prompted to log in or confirm deployment settings."
    );
    await runCommand("npx", ["vercel", "--prod"]);

    console.log("Deployment successful!");
    console.log(
      "Please set up your environment variables in the Vercel dashboard if you haven't already."
    );
    console.log("Update your frontend API URL to use the Vercel-provided URL.");
  } catch (error) {
    console.error("An error occurred:", error);
  } finally {
    rl.close();
  }
}

console.log("Calling deployProject function");
deployProject();
