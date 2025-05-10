#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const { accessSync } = require('fs/promises');
const os = require('os');
const path = require('path');
const readline = require('readline-sync');
const which = require('which');

function isExecutableInPath(command) {
  try {
    const path = which.sync(command);
    return path.length > 0;
  } catch {
    return false;
  }
}

const getPreferredPackageManager = () => {
  const answer = readline.question("Do you prefer (npm) or (yarn)? [yarn]: ").toLowerCase();
  if (answer === "yarn" || answer.length === 0) {
    return "yarn"
  } else if (answer === "npm") {
    return "npm"
  } else {
    return getPreferredPackageManager();
  }
}

function isValidPackageName(name) {
  // Package names must be lowercase
  if (name !== name.toLowerCase()) return false;

  // Check length
  if (name.length === 0 || name.length > 214) return false;

  // Must be URL-safe
  if (!/^[a-z0-9-._~]+$/.test(name)) return false;

  // Cannot start with . or _
  if (name.startsWith('.') || name.startsWith('_')) return false;

  // Cannot contain consecutive dots
  if (name.includes('..')) return false;

  // Cannot be 'node_modules' or 'favicon.ico'
  if (['node_modules', 'favicon.ico'].includes(name)) return false;

  return true;
}

const getPreferredProjectName = () => {
  const answer = readline.question("What would you like to name your project? [my_project]: ");
  if (answer.length === 0) {
    return "my_project"
  } else if (!isValidPackageName(answer)) {
    console.log("Provided an invalid project name");
    return getPreferredProjectName();
  }

  return answer;
}

const shouldAssistWithAuth = () => {
  const answer = readline.question("Would you like to connect to your LSD account (Y)es/(N)o? [Y]: ").toLowerCase();
  if (answer === "y" || answer.length === 0) {
    return "y"
  } else if (answer === "n") {
    return "n"
  } else {
    return shouldAssistWithAuth();
  }
}

const shouldAssistWithBicycle = () => {
  const answer = readline.question("Would you like to download the Bicycle browser (Y)es/(N)o? [Y]: ").toLowerCase();
  if (answer === "y" || answer.length === 0) {
    return "y"
  } else if (answer === "n") {
    return "n"
  } else {
    return shouldAssistWithBicycle();
  }
}

const assistWithLSDAuth = () => {
  console.log(`Click on the following URL to create an account
then go to your profile and create an API key.

https://lsd.so/signin`);

  const user = readline.question("Enter your username (the email you used to sign in): ");
  const password = readline.question("Enter your API key: ");

  const configFilePath = path.join(os.homedir(), ".lsd");
  fs.writeFileSync(configFilePath, JSON.stringify({
    user,
    password,
  }, null, 2));
}

const assistWithBicycle = () => {
  console.log(`Click on the following URL to download the Bicycle
browser and hit enter when you're done.`)

  const _ = readline.question("Hit enter when you're done: ");
}

const isBicycleInstalled = () => {
  if (process.platform === 'darwin') {  // macOS
    return fs.existsSync('/Applications/Bicycle.app');
  } else if (process.platform === 'win32') {  // Windows
    return fs.existsSync('C:\\Program Files\\Bicycle') || 
           fs.existsSync('C:\\Program Files (x86)\\Bicycle');
  } else {  // Linux
    return fs.existsSync('/usr/bin/Bicycle') || 
           fs.existsSync('/usr/local/bin/Bicycle');
  }
}

const lsdAuthExists = () => {
  const configFilePath = path.join(os.homedir(), ".lsd");
  const configFileExists = fs.existsSync(configFilePath);
  if (configFileExists) {
    return true;
  }

  const userEnvVar = process.env.LSD_USER || "";
  const passwordEnvVar = process.env.LSD_PASSWORD || "";

  if (userEnvVar && passwordEnvVar) {
    return true
  }

  return false
}

const authWizard = () => {
  const authenticated = lsdAuthExists();
  if (!authenticated) {
    const shouldAssist = shouldAssistWithAuth();
    if (shouldAssist === "y") {
      assistWithLSDAuth();
    }
  }
}

const bicycleWizard = () => {
  const hasBicycle = isBicycleInstalled();
  if (!hasBicycle) {
    const shouldAssist = shouldAssistWithBicycle();

    if (shouldAssist === "y") {
      assistWithBicycle();
    }
  }
}

const createProjectFolder = (name) => {
  fs.mkdirSync(name);
  process.chdir(`./${name}`);
}

const copyRelevantFiles = () => {
  fs.writeFileSync("tsconfig.json", JSON.stringify({
    compilerOptions: {
      lib: ["es2015", "dom"],
      target: "es2015",
      moduleResolution: "node",
      allowSyntheticDefaultImports: true
    },
    exclude: [
      "dist",
      "node_modules"
    ]
  }, null, 2));
}

const assistWithIndexTS = () => {
  const target = readline.question("What URL are you interested in? [https://lsd.so]: ");

  const hasBicycle = isBicycleInstalled();
  fs.writeFileSync("index.ts", `import drop from "internetdata";
import { z } from "zod";

const run = async () => {
  const trip = await drop.tab();

  const pageSchema = z.array(
    z.object({
      title: z.string(),
    }),
  );

  const pageTitle = await trip
    // If you have the Bicycle installed you can control a browser locally https://lsd.so/bicycle
    // .on('${hasBicycle ? "BROWSER" : "TRAVERSER"}')
    .navigate('${target}')
    .select('title')
    .extrapolate<typeof pageSchema>(pageSchema);

  console.log("What is the title of the page at [${target}]?");
  console.log(pageTitle);
};

run();`);
}

const copyDefaultIndexTS = () => {
  const hasBicycle = isBicycleInstalled();
  fs.writeFileSync("index.ts", `import drop from "internetdata";
import { z } from "zod";

const run = async () => {
  const trip = await drop.tab();

  const docsSchema = z.array(
    z.object({
      title: z.string(),
    }),
  );

  const docsTitle = await trip
    // If you have the Bicycle installed you can control a browser locally https://lsd.so/bicycle
    // .on('${hasBicycle ? "BROWSER" : "TRAVERSER"}')
    .navigate('https://lsd.so/docs')
    .select('title')
    .extrapolate<typeof docsSchema>(docsSchema);

  console.log("What is the title of the database docs page?");
  console.log(docsTitle);
};

run();`);
}

const initNewProject = (packageManager, projectName) => {
  execSync(`${packageManager} init -y --name=${projectName}`, {stdio: 'inherit'});
  if (packageManager === "yarn") {
    execSync(`yarn add internetdata zod`, { stdio: 'inherit' });
  } else {
    execSync(`npm i internetdata zod`, { stdio: 'inherit' });
  }
}

const shouldAssistWithCode = () => {
  const answer = readline.question("Would you like help writing your internetdata integration (Y)es/(N)o? [Y]: ").toLowerCase();
  if (answer === "y" || answer.length === 0) {
    return "y"
  } else if (answer === "n") {
    return "n"
  } else {
    return shouldAssistWithCode();
  }
}

const goUpADirectory = () => {
  process.chdir(`./..`);
}

const printProjectDetails = (name) => {
  console.log(`Created a new internetdata project: ${name}
Get started by running the index.ts file:

$ cd ${name} && npx ts-node index.ts`);
}

const createYourInternet = () => {
  console.clear();

  // Getting information for the project itself
  const preferredPackageManager = getPreferredPackageManager();
  const packageManagerInPath = isExecutableInPath(preferredPackageManager);
  if (!packageManagerInPath) {
    console.error(`Requested package manager [${preferredPackageManager}] however was not accessible in the path`);
    return;
  }
  const projectName = getPreferredProjectName();

  // Assisting with tooling for LSD projects
  authWizard();
  bicycleWizard();

  // Assisting with the code scaffolding
  createProjectFolder(projectName);
  copyRelevantFiles();
  initNewProject(preferredPackageManager, projectName);

  // Assisting with the entry point file
  const assistWithCode = shouldAssistWithCode();
  console.log(`Should we assist with code? ${assistWithCode}`);
  if (assistWithCode === "y") {
    assistWithIndexTS()
  } else {
    copyDefaultIndexTS();
  }

  // Resetting and printing information about the new project before exiting
  goUpADirectory();
  printProjectDetails(projectName);
}

createYourInternet();
