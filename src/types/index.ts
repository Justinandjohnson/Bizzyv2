
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
