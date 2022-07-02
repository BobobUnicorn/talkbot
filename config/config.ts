export const config = {
    devIds: ['279935071165743105', '388834196132724756'],
    neglectTimeout: 60 * 60 * 1000,
    neglectTimeoutMessages: ['Talkbot inactivity timeout'],
    prefix: '!',
    twitch: {
        advertiseStreamer: 'myselfwhat',
        audioQueueLimit: 10,
    },
    supportServer: '490087447758241793',
    pesterThreshold: 100000,
    servers: {
        '-1': {
            pesterThreshold: 100000,
            dailyCharLimit: 10000,
            twitch: {
                audioQueueLimit: 10,
            },
        },
    },
    tts: {
        google: {
            enabled: true,
            enforceLimit: false,
            limit: 5000000,
        },
        azure: {
            enabled: false,
            enforceLimit: false,
            limit: 5000000,
            endpoint: 'https://eastus.tts.speech.microsoft.com/',
        },
        amazon: {
            enabled: false,
            enforceLimit: true,
            limit: 5000000,
            endpoint: 'us-east-1',
        },
        watson: {
            enabled: false,
            enforceLimit: false,
            limit: 5000000,
            endpoint: '',
        },
        tencent: {
            enabled: false,
            enforceLimit: true,
            limit: 1000000,
        },
        alibaba: {
            enabled: false,
            enforceLimit: true,
            limit: 1000000,
            endpoint: 'https://nls-gateway-ap-southeast-1.aliyuncs.com/stream/v1/tts',
        },
    },
};
