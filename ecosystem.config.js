module.exports = {
    apps: [
        {
            name: 'zox-web',
            script: 'npm',
            args: 'start',
            cwd: '/home/ubuntu/zox-nextjs',
            // Next.js `next start` binds one port (3000); multiple PM2 forks would fight for it.
            // Use 1 instance here; scale horizontally (more EC2 / multiple ports + nginx upstream) for more processes.
            instances: 1,
            autorestart: true,
            watch: false,
            env_file: '/home/ubuntu/zox-nextjs/.env.local',
            env: {
                NODE_ENV: 'production',
                PORT: 3000,
                NODE_OPTIONS: '--max-old-space-size=4096'
            },
            log_date_format: 'YYYY-MM-DD HH:mm Z',
        },
        {
            name: 'zox-cron',
            script: 'npm',
            args: 'run cron:start',
            cwd: '/home/ubuntu/zox-nextjs',
            instances: 1,
            autorestart: true,
            watch: false,
            env_file: '/home/ubuntu/zox-nextjs/.env.local',
            env: {
                NODE_ENV: 'production',
                ENABLE_CRON: 'true',
                ENABLE_RSS_PROCESSING: 'true',
                ENABLE_IMAGE_DOWNLOAD: 'true',
                DB_CONNECTION_LIMIT: '8',
            },
            log_date_format: 'YYYY-MM-DD HH:mm Z',
        }
    ]
};
