const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});



// TODO: Uncomment the code below to pass the first stage
rl.question("$ ", (command) => {
  console.log(`${command}: command not found`);
  rl.close();
});
