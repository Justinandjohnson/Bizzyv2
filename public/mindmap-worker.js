self.onmessage = function (e) {
  const { type, data } = e.data;

  if (type === "processGraphData") {
    // Perform heavy computations here
    const result = heavyComputation(data);
    self.postMessage({ type: "processedGraphData", data: result });
  }
};

function heavyComputation(data) {
  // Implement your heavy computation logic here
  return data;
}
