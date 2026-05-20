module.exports = {
  apps: [
    {
      name: 'mpc-service',
      cwd: '/opt/zwallet/zwallet/backend/services/mpc-service',
      script: 'npm',
      args: 'start',
      env: { NODE_ENV: 'production', PORT: 3005 }
    },
    {
      name: 'aa-orchestrator',
      cwd: '/opt/zwallet/zwallet/backend/services/aa-orchestrator',
      script: 'npm',
      args: 'start',
      env: { NODE_ENV: 'production', PORT: 3006 }
    },
    {
      name: 'swap-service',
      cwd: '/opt/zwallet/zwallet/backend/services/swap-service',
      script: 'npm',
      args: 'start',
      env: { NODE_ENV: 'production', PORT: 3004 }
    },
    {
      name: 'indexer-service',
      cwd: '/opt/zwallet/zwallet/backend/services/indexer-service',
      script: 'npm',
      args: 'start',
      env: { NODE_ENV: 'production', PORT: 3007 }
    },
    {
      name: 'gateway',
      cwd: '/opt/zwallet/zwallet/backend/services/gateway',
      script: 'npm',
      args: 'start',
      env: { NODE_ENV: 'production', PORT: 8080 }
    },
    {
      name: 'defi-dashboard',
      cwd: '/opt/zwallet/apps/defi-dashboard',
      script: 'npm',
      args: 'start',
      env: { NODE_ENV: 'production', PORT: 3000 }
    },
    {
      name: 'z-admin',
      cwd: '/opt/zwallet/apps/z-admin',
      script: 'npm',
      args: 'start',
      env: { NODE_ENV: 'production', PORT: 3003 }
    }
  ]
};
