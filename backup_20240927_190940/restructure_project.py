import os
import re
import shutil
import datetime
import subprocess
import sys
import argparse
import time

def run_command(command, timeout=30):
    start_time = time.time()
    process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
    try:
        output, error = process.communicate(timeout=timeout)
        if process.returncode != 0:
            print(f"Error executing command: {command}")
            print(f"Error message: {error.decode('utf-8')}")
            return False, error.decode('utf-8')
        return True, output.decode('utf-8')
    except subprocess.TimeoutExpired:
        process.kill()
        print(f"Command timed out after {timeout} seconds: {command}")
        return False, "Timeout"
    finally:
        end_time = time.time()
        print(f"Command '{command}' took {end_time - start_time:.2f} seconds")

def create_local_backup():
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = f"backup_{timestamp}"
    
    try:
        shutil.copytree('.', backup_dir, ignore=shutil.ignore_patterns('.git', 'node_modules', '__pycache__', '*.pyc'))
        print(f"Local backup created in directory: {backup_dir}")
        return backup_dir
    except Exception as e:
        print(f"Failed to create local backup: {str(e)}")
        return None

def create_git_backup(auto_stash=False):
    print("Starting Git backup process...")
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_branch = f"backup_{timestamp}"

    print("Checking for uncommitted changes...")
    success, output = run_command("git diff-index --quiet HEAD --")
    if not success:
        print(f"Git diff-index output: {output}")
        if auto_stash:
            print("Uncommitted changes detected. Attempting to stash changes...")
            success, stash_output = run_command("git stash --include-untracked")
            print(f"Git stash output: {stash_output}")
            if not success:
                print("Failed to stash changes. Proceeding with local backup only.")
                return None, create_local_backup()
        else:
            print("There are uncommitted changes. Proceeding with local backup only.")
            return None, create_local_backup()

    print(f"Creating new branch: {backup_branch}")
    success, checkout_output = run_command(f"git checkout -b {backup_branch}")
    print(f"Git checkout output: {checkout_output}")
    if not success:
        print("Failed to create new branch. Proceeding with local backup only.")
        return None, create_local_backup()

    print(f"Pushing new branch to remote: {backup_branch}")
    success, push_output = run_command(f"git push -u origin {backup_branch}")
    print(f"Git push output: {push_output}")
    if not success:
        print("Failed to push to remote. Backup branch exists locally.")
        return backup_branch, create_local_backup()

    if auto_stash:
        print("Applying stashed changes...")
        success, pop_output = run_command("git stash pop")
        print(f"Git stash pop output: {pop_output}")
        if not success:
            print("Failed to apply stashed changes. They remain in the stash.")

    print(f"Backup created on branch: {backup_branch}")
    return backup_branch, None

def create_directory_structure():
    directories = [
        'src/components/EnhancedBrainstormer',
        'src/components/EnhancedBrainstormer/ChatTab',
        'src/components/EnhancedBrainstormer/MindMapTab',
        'src/components/EnhancedBrainstormer/SavedIdeasTab',
        'src/components/EnhancedBrainstormer/TrendsTab',
        'src/hooks',
        'src/services',
        'src/types',
        'src/utils'
    ]
    for directory in directories:
        os.makedirs(directory, exist_ok=True)

def move_ui_components():
    if not os.path.exists('src/components/ui'):
        os.makedirs('src/components/ui')
    for file in os.listdir('components'):
        if file.endswith('.tsx') and file != 'enhanced-brainstormer.tsx':
            shutil.move(f'components/{file}', f'src/components/ui/{file}')

def extract_tab_content(content, tab_name):
    pattern = rf'<TabsContent value="{tab_name}">(.*?)</TabsContent>'
    match = re.search(pattern, content, re.DOTALL)
    return match.group(1) if match else ''

def create_tab_component(tab_name, content):
    filename = f'src/components/EnhancedBrainstormer/{tab_name}Tab/index.tsx'
    with open(filename, 'w') as f:
        f.write(f'''
import React from 'react';

export default function {tab_name}Tab({{/* props */}}) {{
    return (
        <div>
            {content.strip()}
        </div>
    );
}}
''')

def create_main_component(content):
    with open('src/components/EnhancedBrainstormer/index.tsx', 'w') as f:
        f.write('''
import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ChatTab from './ChatTab';
import MindMapTab from './MindMapTab';
import SavedIdeasTab from './SavedIdeasTab';
import TrendsTab from './TrendsTab';

export function EnhancedBrainstormer() {
    // Shared state
    const [messages, setMessages] = useState([]);
    const [currentIdea, setCurrentIdea] = useState('');
    // ... other shared state

    return (
        <div className="relative min-h-screen w-full overflow-hidden">
            {/* Video Background */}
            {/* ... */}
            
            <div className="relative z-10 min-h-screen w-full bg-black bg-opacity-50 flex items-center justify-center p-4">
                <div className="container mx-auto max-w-full h-full flex flex-col">
                    <Card className="flex-grow shadow-lg bg-white bg-opacity-90 backdrop-blur-sm overflow-hidden">
                        <h1 className="text-3xl font-bold mb-6 text-[#2D3748] flex items-center">
                            Enhanced AI Business Idea Brainstormer
                            {/* ... */}
                        </h1>
                        <Tabs defaultValue="chat" className="w-full">
                            <TabsList className="grid w-full grid-cols-4 mb-4">
                                {/* ... Tab triggers ... */}
                            </TabsList>
                            <TabsContent value="chat">
                                <ChatTab 
                                    messages={messages} 
                                    setMessages={setMessages}
                                    currentIdea={currentIdea}
                                    setCurrentIdea={setCurrentIdea}
                                    // ... other props
                                />
                            </TabsContent>
                            <TabsContent value="mindmap">
                                <MindMapTab 
                                    // ... props
                                />
                            </TabsContent>
                            <TabsContent value="saved">
                                <SavedIdeasTab 
                                    // ... props
                                />
                            </TabsContent>
                            <TabsContent value="trends">
                                <TrendsTab 
                                    // ... props
                                />
                            </TabsContent>
                        </Tabs>
                    </Card>
                </div>
            </div>
        </div>
    );
}
''')

def create_hooks():
    hooks = ['useChat', 'useMindMap', 'useSavedIdeas', 'useTrends']
    for hook in hooks:
        with open(f'src/hooks/{hook}.ts', 'w') as f:
            f.write(f'''
import {{ useState }} from 'react';

export function {hook}() {{
    // Implement hook logic here
    return {{
        // Return relevant state and functions
    }};
}}
''')

def create_api_service():
    with open('src/services/api.ts', 'w') as f:
        f.write('''
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function fetchChat(message: string, context: string[]) {
    // Implement chat API call
}

export async function generateMindMap(idea: string) {
    // Implement mind map generation API call
}

// Add other API functions as needed
''')

def create_types():
    with open('src/types/index.ts', 'w') as f:
        f.write('''
export interface Node {
    id: string;
    name: string;
    val: number;
    color?: string;
    expanded?: boolean;
    parentId?: string;
    depth?: number;
}

export interface Link {
    source: string;
    target: string;
    distance?: number;
}

export interface GraphData {
    nodes: Node[];
    links: Link[];
}

// Add other types and interfaces as needed
''')

def create_utils():
    with open('src/utils/graphUtils.ts', 'w') as f:
        f.write('''
export function calculateNodeSize(label: string): number {
    return Math.max(label.length * 6, 40);
}

// Add other graph utility functions as needed
''')

    with open('src/utils/debounce.ts', 'w') as f:
        f.write('''
export function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    return (...args: Parameters<F>): Promise<ReturnType<F>> => {
        return new Promise((resolve) => {
            if (timeout) {
                clearTimeout(timeout);
            }

            timeout = setTimeout(() => resolve(func(...args)), waitFor);
        });
    };
}
''')

def restructure_project():
    try:
        create_directory_structure()
        move_ui_components()

        with open('components/enhanced-brainstormer.tsx', 'r') as f:
            content = f.read()

        create_main_component(content)

        for tab in ['Chat', 'MindMap', 'SavedIdeas', 'Trends']:
            tab_content = extract_tab_content(content, tab.lower())
            create_tab_component(tab, tab_content)

        create_hooks()
        create_api_service()
        create_types()
        create_utils()

        # Remove the original file
        os.remove('components/enhanced-brainstormer.tsx')

        print("Project restructuring completed successfully!")
        return True
    except Exception as e:
        print(f"An error occurred during restructuring: {str(e)}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Restructure the Enhanced Brainstormer project")
    parser.add_argument('--auto-stash', action='store_true', help="Automatically stash and reapply uncommitted changes")
    args = parser.parse_args()

    print("Creating Git backup of the current project...")
    backup_branch, local_backup = create_git_backup(args.auto_stash)
    
    if not backup_branch and not local_backup:
        print("Failed to create any backup. Do you want to proceed with restructuring? (y/n)")
        response = input().lower()
        if response != 'y':
            print("Aborting restructuring.")
            return

    print("Starting project restructuring...")
    success = restructure_project()
    
    if success:
        if backup_branch:
            print(f"Project restructuring completed successfully. A backup of the original project is available on the Git branch: {backup_branch}")
        if local_backup:
            print(f"A local backup of the original project is available in the directory: {local_backup}")
    else:
        if backup_branch:
            print(f"Project restructuring failed. The original project is available on the Git branch: {backup_branch}")
        if local_backup:
            print(f"A local backup of the original project is available in the directory: {local_backup}")
        print("To restore the original project, you can use the local backup or run: git checkout main && git reset --hard origin/main")

if __name__ == "__main__":
    main()