#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { indexCommand } from './commands/index.js';
import { watchCommand } from './commands/watch.js';
import { queryCommand } from './commands/query.js';
import { validateCommand } from './commands/validate.js';
import { discoverCommand } from './commands/discover.js';
import { retrieveCommand } from './commands/retrieve.js';
import { rewriteCommand } from './commands/rewrite.js';
import { extractCommand } from './commands/extract.js';
import { generateCommand } from './commands/generate.js';
import { injectLinksCommand } from './commands/inject-links.js';
import { visualizeCommand } from './commands/visualize.js';
import { setupCommand } from './commands/setup.js';
import { constellationCommand } from './commands/constellation.js';
import { embedCommand } from './commands/embed.js';
import { wormholeCommand } from './commands/wormhole.js';
import { pathCommand } from './commands/path.js';
import { doctorCommand } from './commands/doctor.js';
import { focusCommand } from './commands/focus.js';
import { approveCommand } from './commands/approve.js';
import { rejectCommand } from './commands/reject.js';

const program = new Command();

program
  .name('zettel')
  .description('ZettelScript - Graph-first knowledge management system')
  .version('0.1.0');

// Register commands
program.addCommand(initCommand);
program.addCommand(indexCommand);
program.addCommand(watchCommand);
program.addCommand(queryCommand);
program.addCommand(validateCommand);
program.addCommand(discoverCommand);
program.addCommand(retrieveCommand);
program.addCommand(rewriteCommand);
program.addCommand(extractCommand);
program.addCommand(generateCommand);
program.addCommand(injectLinksCommand);
program.addCommand(visualizeCommand);
program.addCommand(setupCommand);
program.addCommand(constellationCommand);
program.addCommand(embedCommand);
program.addCommand(wormholeCommand);
program.addCommand(pathCommand);
program.addCommand(doctorCommand);
program.addCommand(focusCommand);
program.addCommand(approveCommand);
program.addCommand(rejectCommand);

// Parse arguments
program.parse();
