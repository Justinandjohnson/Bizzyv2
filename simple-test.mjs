import axios from "axios";

const BASE_URL = "http://localhost:3001";
const ENDPOINT = "/api/generate-idea";

async function testGenerateIdea() {
  console.log("Testing /api/generate-idea endpoint...");

  const testCases = [
    {
      name: "Basic test",
      nodes: [
        "Cat Subscription Box",
        "Eco-Friendly Toys",
        "Toy Rental Service",
      ],
    },
    {
      name: "Empty nodes",
      nodes: [],
    },
    {
      name: "Single node",
      nodes: ["Pet Tech"],
    },
  ];

  for (const testCase of testCases) {
    console.log(`\nRunning test case: ${testCase.name}`);
    try {
      const response = await axios.post(`${BASE_URL}${ENDPOINT}`, {
        nodes: testCase.nodes,
      });

      console.log("Status:", response.status);
      console.log("Response data:", response.data);

      if (response.data && response.data.idea) {
        console.log("Idea generated successfully");
      } else {
        console.log("Warning: Response doesn't contain an idea");
      }
    } catch (error) {
      console.error("Error occurred:");
      if (error.response) {
        console.error("Status:", error.response.status);
        console.error("Response data:", error.response.data);
      } else if (error.request) {
        console.error("No response received. Is the server running?");
      } else {
        console.error("Error message:", error.message);
      }
    }
  }

  // Test server connectivity
  try {
    await axios.get(`${BASE_URL}/`);
    console.log("\nServer is reachable");
  } catch (error) {
    console.error(
      "\nError: Cannot reach the server. Make sure it's running on the correct port."
    );
  }
}

testGenerateIdea();
