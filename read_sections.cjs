const fs = require("fs");
const src = fs.readFileSync("viewer/src/App.jsx", "utf8");
const lines = src.split("\n");

// lines 260-300 (MD component terminal section)
console.log("=== lines 260-300 ===");
lines.slice(259, 300).forEach((l,i) => console.log(260+i, l));
