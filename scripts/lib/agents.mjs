// Shared install targets for the skill installer and the eval isolation tool.
// Keeping one map means a new agent path cannot be added in one place and
// forgotten in the other.

import os from 'node:os';
import path from 'node:path';

export const SKILL_NAME = 'kinetic-ui';

export const AGENTS = {
  opencode: {
    user: (home = os.homedir()) => path.join(home, '.config', 'opencode', 'skills'),
    project: (project) => path.join(project, '.opencode', 'skills'),
  },
  claude: {
    user: (home = os.homedir()) => path.join(home, '.claude', 'skills'),
    project: (project) => path.join(project, '.claude', 'skills'),
  },
  agents: {
    user: (home = os.homedir()) => path.join(home, '.agents', 'skills'),
    project: (project) => path.join(project, '.agents', 'skills'),
  },
};
