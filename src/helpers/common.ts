import { config } from '../../config/config.js';
import { Collection } from 'discord.js';
import * as util from 'util';

//clean string so its usable in RegExp
export function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

export function isURL(url: string) {
    try {
        new URL(url);
        return true;
    } catch (e: unknown) {
        return false;
    }
}

//console.log() if its turned on
export function out(message: string | Error | null) {
    if (!message) message = 'null';
    if (typeof message == 'object' && message.stack) {
        message = message.stack;
    }

    if (config.logging && config.logging.out) {
        console.log(
            new Date().toISOString() +
                ' ' +
                message +
                (message.indexOf && message.indexOf('\n') > -1 ? '\n' : ''),
        );
    }
}

//Common.error() is its turned out
export function error(message: string | Error | null) {
    if (!message) message = 'null';
    if (typeof message == 'object' && message.stack) {
        message = message.stack;
    } else if (typeof message == 'object') {
        message = util.inspect(message);
    }

    if (config.logging && config.logging.err) {
        console.error(
            new Date().toISOString() +
                ' ' +
                message +
                (message.indexOf && message.indexOf('\n') > -1 ? '\n' : ''),
        );
    }
}

//dont know.
// it stops messages with three thingos from being read out
export function isMessageExcluded(message: string) {
    return message.startsWith('```');
}

//clamp a number between two range
export function numberClamp(number: number, min: number, max: number) {
    return Math.min(Math.max(number, min), max);
}

// generates a java compatible hashcode from a string
export function hashCode(s: string) {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    }
    return h;
}

export function numberMap(n: number = 0, r1: number = 0, r2: number = 1, m1: number = 0, m2: number = 100) {
    n = numberClamp(n, r1, r2);
    return ((n - r1) / (r2 - r1)) * (m2 - m1) + m1;
}

//map input number from one range to another range
export function scaleToRange(num: number, in_min: number, in_max: number, out_min: number, out_max: number) {
    const number = numberClamp(num, in_min, in_max);
    return ((number - in_min) * (out_max - out_min)) / (in_max - in_min) + out_min;
}

//make cased names become human readable
export function caseToSpace(nick_name: string) {
    if (!nick_name) return '';
    return nick_name.replace(/([a-z])([A-Z])/g, function (_a, b, c) {
        return b + ' ' + c;
    });
}

// replaces the last instance of strToReplace with replacement
export function replaceLast(str: string, strToReplace: string, replacement: string) {
    const pos = str.lastIndexOf(strToReplace);
    if (pos < 0) return str;
    return str.substring(0, pos) + replacement + str.substring(pos + strToReplace.length);
}

export function arg() {
    return {
        name: '',
        value: '',
    };
}

export function camelize(str: string) {
    return str
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/-|_/g, ' ')
        .toLowerCase()
        .replace(/\b[a-z]/g, function (b, c) {
            return b.toUpperCase();
        });
}

//remove urls with notheing
//used for cleaning
export function removeUrls(message: string, fn?: string) {
    return message.replace(/https*:\/\/\S*/g, fn ? fn : '');
}

//removes repeating character or character groups aaaaaaaaaaaaa or asdasdasdasdasd
export function removeRepeatingChar(message: string) {
    const maxChars = 6;
    const a = message.split('');
    const leaveOneRemaining = true;
    const thresholdToStartStriping = maxChars;

    let lastletter = '';
    let stripLength = leaveOneRemaining ? 0 : 1;
    for (let i = a.length; i > 0; i--) {
        let letter = a[i - 1];

        if (lastletter == letter) {
            stripLength++;
        } else if (stripLength > thresholdToStartStriping) {
            a.splice(i, stripLength);
            stripLength = leaveOneRemaining ? 0 : 1;
        } else {
            stripLength = leaveOneRemaining ? 0 : 1;
        }
        lastletter = letter;
    }

    return a.join('');
}

//remove line feeds and new lines
export function removeNullsChars(message: string) {
    return message.replace(/\n|\r/gi, '');
}

//truncate message to 2000 characters should be used before all the other things
export function truncateMessage(message: string) {
    if (message.length > 2000) {
        message = message.substring(0, 2000);
    }
    return message;
}

//cleant a message ready for speaking
export function cleanMessage(message: string) {
    message = message.trim();
    message = removeUrls(message);
    message = removeRepeatingChar(message);
    message = removeNullsChars(message);
    message = truncateMessage(message);
    return message;
}

export function makeCsv<K, V>(collection: Collection<K, V>, selector: (item: V) => string) {
    let csv = '';
    if (collection.size == 0) return '';
    for (const [, item] of collection) {
        csv += selector(item) + ', ';
    }
    csv = csv.substring(0, csv.length - 2);

    return csv;
}

export function makeNiceCsv<K, V>(collection: Collection<K, V>, selector: (item: V) => string) {
    return replaceLast(makeCsv(collection, selector), ', ', ' and ');
}

//make some sfx audio tag
export function makeAudioSSML(url: string) {
    return "<audio src='" + url + "' />";
}
