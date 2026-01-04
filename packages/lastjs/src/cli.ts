#!/usr/bin/env node
// Re-export and run CLI from @lastjs/cli
import { runCLI } from '@lastjs/cli';

// Always run CLI when this file is executed
runCLI();

export { runCLI };
