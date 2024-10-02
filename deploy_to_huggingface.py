import os
import json
from huggingface_hub import HfApi, create_repo
from dotenv import load_dotenv

# Set the project root directory
PROJECT_ROOT = os.getcwd()  # Assumes you're running the script from the project root

def upload_file(api, space_name, file_path, file_name):
    print(f"Uploading {file_name}...")
    api.upload_file(
        path_or_fileobj=file_path,
        path_in_repo=file_name,
        repo_id=f"youngdenzel/{space_name}",
        repo_type="space",
        token=hf_token
    )

def create_new_space(api, space_name, private):
    print(f"Creating new space: {space_name}")
    create_repo(
        repo_id=f"youngdenzel/{space_name}",
        repo_type="space",
        token=hf_token,
        private=private,
        space_sdk="docker"
    )

def set_space_variables(api, space_name):
    print("Setting environment variables from .env file...")
    env_path = os.path.join(PROJECT_ROOT, '.env')
    load_dotenv(env_path)
    
    env_vars = {}
    with open(env_path, 'r') as f:
        for line in f:
            if '=' in line:
                key, value = line.strip().split('=', 1)
                env_vars[key] = value

    for key, value in env_vars.items():
        api.add_space_variable(
            repo_id=f"youngdenzel/{space_name}",
            key=key,
            value=value,
            token=hf_token
        )
    print("Environment variables have been set in the Hugging Face Space.")

def create_dockerfile():
    dockerfile_content = """
FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000
EXPOSE 3001

CMD ["npm", "run", "start"]
"""
    with open('Dockerfile', 'w') as f:
        f.write(dockerfile_content)
    print("Dockerfile created.")

def update_package_json():
    with open('package.json', 'r') as f:
        package_data = json.load(f)
    
    # Ensure we have scripts to build and run TypeScript
    package_data['scripts']['build'] = 'next build && tsc -p backend'
    package_data['scripts']['start'] = 'concurrently "npm run start:frontend" "npm run start:backend"'
    package_data['scripts']['start:frontend'] = 'next start -p 7860'
    package_data['scripts']['start:backend'] = 'node dist/backend/server.js'
    
    # Add engine requirements
    package_data['engines'] = {
        "node": ">=18.17.0"
    }
    
    with open('package.json', 'w') as f:
        json.dump(package_data, f, indent=2)
    print("package.json updated.")

def create_npmrc():
    npmrc_content = """
optional=false
fund=false
audit=false
"""
    with open('.npmrc', 'w') as f:
        f.write(npmrc_content)
    print(".npmrc file created.")

def main():
    global hf_token
    hf_token = "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"

    api = HfApi()

    # Ask if creating new project or updating existing one
    action = input("Do you want to create a new project or update an existing one? (new/update): ").lower()
    
    if action == "new":
        space_name = input("Enter the name for your new Hugging Face Space: ")
        private = input("Do you want the space to be private? (yes/no): ").lower() == "yes"
        create_new_space(api, space_name, private)
    elif action == "update":
        space_name = input("Enter the name of your existing Hugging Face Space: ")
    else:
        print("Invalid option. Please run the script again and choose 'new' or 'update'.")
        return

    # Set environment variables
    set_space_variables(api, space_name)
    create_dockerfile()
    update_package_json()
    create_npmrc()

    # List of files and directories to upload
    files_to_upload = [
        'package.json', 'next.config.js', 'tsconfig.json', 'tailwind.config.js', 
        'postcss.config.js', '.gitignore', 'README.md', 'Dockerfile', '.npmrc'
    ]
    directories_to_upload = ['pages', 'components', 'styles', 'public', 'backend']

    # Upload individual files
    for file_name in files_to_upload:
        file_path = os.path.join(PROJECT_ROOT, file_name)
        if os.path.exists(file_path):
            upload_file(api, space_name, file_path, file_name)
        else:
            print(f"Warning: {file_name} not found, skipping...")

    # Upload directories
    for dir_name in directories_to_upload:
        dir_path = os.path.join(PROJECT_ROOT, dir_name)
        if os.path.exists(dir_path):
            for root, _, files in os.walk(dir_path):
                for file in files:
                    file_path = os.path.join(root, file)
                    repo_path = os.path.relpath(file_path, PROJECT_ROOT)
                    upload_file(api, space_name, file_path, repo_path)
        else:
            print(f"Warning: {dir_name} directory not found, skipping...")

    print(f"\nYour project has been successfully {'created' if action == 'new' else 'updated'} on Hugging Face Spaces: https://huggingface.co/spaces/youngdenzel/{space_name}")

if __name__ == "__main__":
    main()