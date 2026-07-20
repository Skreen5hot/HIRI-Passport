#!/usr/bin/env node
import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createPassportSdk } from "../sdk/passport.mjs";
import { redactForLog } from "../core/security-state.mjs";

function options(argv) { const result={};for(let i=0;i<argv.length;i+=1){const item=argv[i];if(!item.startsWith("--"))continue;const name=item.slice(2);if(name==="machine")result.machine=true;else result[name]=argv[++i];}return result; }
function integer(value,name,maximum){const parsed=Number(value??0);if(!Number.isInteger(parsed)||parsed<0||parsed>maximum)throw new TypeError(`${name} must be an integer from 0 through ${maximum}`);return parsed;}

export async function runCli(argv,io={},sdk=createPassportSdk()) {
  const [command,...rest]=argv;if(command!=="verify")throw new TypeError("usage: hiri-passport verify --input FILE --now UTC [--message-clock-skew N] [--credential-issuance-tolerance N] [--machine]");const flags=options(rest);if(!flags.input||!flags.now)throw new TypeError("verify requires --input and --now");
  const readText=io.readText??((file)=>fs.readFile(file,"utf8"));const write=io.write??((text)=>process.stdout.write(text));const payload=sdk.parse.json(await readText(flags.input));payload.now=flags.now;payload.parameters={messageClockSkewSeconds:integer(flags["message-clock-skew"],"message clock skew",120),credentialIssuanceToleranceSeconds:integer(flags["credential-issuance-tolerance"],"credential issuance tolerance",300)};
  const report=redactForLog(await sdk.verifyPassport(payload));const output=flags.machine?JSON.stringify(report):`Cryptographic disposition: ${report.cryptographicDisposition}\nPolicy: ${report.policy.result}\nVerified at: ${report.verifiedAt}\nMessage clock skew: ${report.verificationParameters.messageClockSkewSeconds}s\nCredential issuance tolerance: ${report.verificationParameters.credentialIssuanceToleranceSeconds}s`;
  write(`${output}\n`);return report;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)runCli(process.argv.slice(2)).catch((error)=>{process.stderr.write(`${error.message}\n`);process.exitCode=1;});
