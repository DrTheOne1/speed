const fs = require('fs');
const readline = require('readline');
const path = require('path');

// Path to your .env file
const envPath = path.join(__dirname, '..', '.env');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true
});

// Hide input when typing the key
function askHidden(query) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const onData = (char) => {
      char = char + "";
      switch (char) {
        case "\n":
        case "\r":
        case "\u0004":
          stdin.pause();
          break;
        default:
          process.stdout.clearLine(0);
          process.stdout.cursorTo(0);
          process.stdout.write(query + Array(rl.line.length + 1).join("*"));
          break;
      }
    };
    process.stdin.on("data", onData);
    rl.question(query, (value) => {
      rl.history = rl.history.slice(1);
      process.stdin.removeListener("data", onData);
      resolve(value);
    });
  });
}

// Main flow
async function updateEnv() {
  try {
    const newKey = await askHidden("Enter your Supabase SERVICE_ROLE_KEY: ");

    if (!newKey || newKey.length < 30) {
      console.error("❌ Key seems invalid or too short. Aborting.");
      rl.close();
      return;
    }

    let envContent = fs.readFileSync(envPath, 'utf-8');

    const updatedEnv = envContent.replace(
      /VITE_SUPABASE_SERVICE_ROLE_KEY=.*/g,
      `VITE_SUPABASE_SERVICE_ROLE_KEY=${newKey}`
    );

    fs.writeFileSync(envPath, updatedEnv);

    console.log("✅ .env file updated successfully!");

    rl.close();
  } catch (err) {
    console.error("❌ Error updating .env file:", err.message);
    rl.close();
  }
}

updateEnv(); 