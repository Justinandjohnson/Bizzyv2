import os
import re
import shutil
import datetime
import subprocess
import sys

def run_command(command):
    process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
    output, error = process.communicate()
    if process.returncode != 0:
        print(f"Error executing command: {command}")
        print(f"Error message: {error.decode('utf-8')}")
        return False
    return True

def create_git_backup():
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_branch = f"backup_{timestamp}"

    # Check if there are any uncommitted changes
    if not run_command("git diff-index --quiet HEAD --"):
        print("There are uncommitted changes. Please commit or stash them before running this script.")
        return None

    # Create a new branch for the backup
    if not run_command(f"git checkout -b {backup_branch}"):
        return None

    # Push the new branch to remote
    if not run_command(f"git push -u origin {backup_branch}"):
        return None

    print(f"Backup created on branch: {backup_branch}")
    return backup_branch

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
    for file in os.listdir('src/components'):
        if file.endswith('.tsx') and file != 'enhanced-brainstormer.tsx':
            shutil.move(f'src/components/{file}', f'src/components/ui/{file}')

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

        with open('src/components/enhanced-brainstormer.tsx', 'r') as f:
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
        os.remove('src/components/enhanced-brainstormer.tsx')

        print("Project restructuring completed successfully!")
    except Exception as e:
        print(f"An error occurred during restructuring: {str(e)}")
        return False
    return True

def main():
    print("Creating Git backup of the current project...")
    backup_branch = create_git_backup()
    
    if not backup_branch:
        print("Failed to create Git backup. Aborting restructuring.")
        return

    print("Starting project restructuring...")
    success = restructure_project()
    
    if success:
        print(f"Project restructuring completed successfully. A backup of the original project is available on the Git branch: {backup_branch}")
    else:
        print(f"Project restructuring failed. The original project is available on the Git branch: {backup_branch}")
        print("To restore the original project, run: git checkout main && git reset --hard origin/main")

if __name__ == "__main__":
    main()