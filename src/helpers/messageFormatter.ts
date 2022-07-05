export interface MessageFormatData {
    heading?: string;
    data: MessageFormatData[] | Record<string, MessageFormatData[] | MessageFormatData | string | number>;
}

export interface MessageFormatOptions {
    padding?: string;
    data?: MessageFormatData | MessageFormatData[];
}

export function formatMessage(opts: MessageFormatOptions) {
    return `\`\`\`asciidoc
${formatMessageRecursively(opts)}
\`\`\``;
}

function formatMessageRecursively({ padding, data }: MessageFormatOptions, currentPadding = ''): string {
    if (!data) {
        return '';
    }
    const parts = [];
    if ('heading' in data && typeof data.heading === 'string') {
        parts.push(formatHeading(data.heading));
    }

    const formatData = Array.isArray(data) ? data : data.data;

    let max = 0;
    if (!Array.isArray(formatData)) {
        max = Math.max(...Object.keys(formatData).map((key) => key.length));
    }

    const entries = Array.isArray(formatData) ? formatData.entries() : Object.entries(formatData);
    for (const [key, element] of entries) {
        if (Array.isArray(element) || typeof element === 'object') {
            typeof key === 'number' && parts.push(formatHeading(String(key)));
            parts.push(formatMessageRecursively({ padding, data: element }, padding));
        } else {
            parts.push(formatRow(currentPadding, max, key, String(element)));
        }
    }
    return parts.join('\n');
}

function formatRow(padding: string, keyAlignment: number, key: number | string, element: string) {
    if (typeof key === 'number') {
        return `${padding}${element}`;
    }
    return `${padding}${key.padEnd(keyAlignment)} :: ${element.trim()}`;
}

function formatHeading(heading: string) {
    return `\n= ${heading} =`;
}
