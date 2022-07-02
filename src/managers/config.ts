import { Snowflake } from 'discord.js';
import { config } from '../../config/config.js';
import dotenv from 'dotenv-safe';
import { messages, Messages } from '../../config/messages.js';
import { defaultTextRules } from '../../config/defaultTextRules.js';
import * as fs from 'fs/promises';
import * as z from 'zod';

interface TwitchConfig {
    advertiseStreamer?: string;
    audioQueueLimit: number;
}

interface ServerConfig {
    pesterThreshold: number;
    dailyCharLimit: number;
    twitch: TwitchConfig;
}

interface TTSConfig {
    enabled: boolean;
    enforceLimit: boolean;
    limit: number;
    endpoint?: string;
}

interface AuthConfig {
    botToken: string;
    azure: {
        subscriptionKey?: string;
    };
    amazon: {
        accessKey?: string;
        secretAccessKey?: string;
    };
    watson: {
        apiKey?: string;
    };
    tencent: {
        accessKey?: string;
        secretAccessKey?: string;
    };
    alibaba: {
        appKey?: string;
        appToken?: string;
    };
}

const Voice = z
    .object({
        language: z.string(),
        type: z.string(),
        code: z.string(),
        translate: z.string(),
        voice: z.string(),
        voice_alias: z.string(),
        gender: z.string(),
        provider: z.string(),
    })
    .transform(({ language, type, code, translate, voice, voice_alias, gender, provider }) => {
        return {
            language,
            type,
            code,
            translate,
            voice,
            voiceAlias: voice_alias,
            gender,
            provider,
        };
    });

const VoiceArray = z.array(Voice);

type VoiceConfig = z.infer<typeof Voice>;

interface Config {
    devIds: Snowflake[];
    neglectTimeout: number;
    neglectTimeoutMessages: string[];
    prefix: string;
    twitch: TwitchConfig;
    supportServer: Snowflake;
    pesterThreshold: number;
    servers: Record<Snowflake, ServerConfig>;
    tts: Record<string, TTSConfig>;

    auth: AuthConfig;
    defaultTextRules: Record<string, string>;
    messages: Record<string, Messages>;
    voices: VoiceConfig[];
}

dotenv.config({
    allowEmptyValues: true,
});

let cachedConfig: Config | undefined = undefined;

export async function getConfig(): Promise<Config> {
    if (cachedConfig) {
        return cachedConfig;
    }

    if (!process.env.TOKEN) {
        throw new Error();
    }

    const auth = {
        botToken: process.env.TOKEN,
        azure: {
            subscriptionKey: process.env.AZURE_SUBSCRIPTION_KEY,
        },
        amazon: {
            accessKey: process.env.AMAZON_ACCESS_KEY_ID,
            secretAccessKey: process.env.AMAZON_SECRET_ACCESS_KEY,
        },
        watson: {
            apiKey: process.env.WATSON_API_KEY,
        },
        tencent: {
            accessKey: process.env.TENCENT_ACCESS_KEY_ID,
            secretAccessKey: process.env.TENCENT_SECRET_ACCESS_KEY,
        },
        alibaba: {
            appKey: process.env.ALIBABA_APP_KEY,
            appToken: process.env.ALIBABA_APP_TOKEN,
        },
    };

    const googleVoices = await fs.readFile(
        new URL(import.meta.url, '../../../config/google-voices.json'),
        'utf8',
    );

    cachedConfig = {
        ...config,
        defaultTextRules,
        messages,
        auth,
        voices: await VoiceArray.parseAsync(googleVoices),
    };
    return cachedConfig;
}
