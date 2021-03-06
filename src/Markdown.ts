import * as _ from "lodash";

/**
 * Try to handle adjacent HTML and Markdown elements that cannot be
 * adjacent in Slack markup.  Used a the function in replace.
 *
 * @param match the full match
 * @param url the URL
 * @param space trailing space, if it exists
 * @return properly padded replacement string
 */
function trailingSpace(match: string, url: string, space: string, offset: number, full: string): string {
    const pad = (offset + match.length === full.length) ? "" : " ";
    return (space) ? url + space : url + pad;
}

/**
 * Replace named Markdown links with parenthesized links.
 *
 * @param text string which may have named Markdown links
 * @return string with explicit links
 */
export function convertNamedLinks(text: string): string {
    const namedLinksRegExp = /^\[(.+?)\]:\s*(https?:\/\/\S+).*\n/mg;
    let matches: string[] | null;
    const links: any = {};
    // tslint:disable-next-line:no-conditional-assignment
    while (matches = namedLinksRegExp.exec(text)) {
        const name = matches[1];
        const url = matches[2];
        links[name] = url;
    }
    let linked: string = text;
    _.forEach(links, (u, n) => {
        const nameRegExp = new RegExp(`\\[(.+?)\\]\\[${n}\\]|\\[${n}\\]\\[\\]`, "g");
        linked = linked.replace(nameRegExp, (m, ln) => {
            const linkName = (ln) ? ln : n;
            return `[${linkName}](${u})`;
        });
    });
    return linked.replace(namedLinksRegExp, "");
}

/**
 * Replace <img> tags with just the image URL.
 *
 * @param text string which may have img tags
 * @return string with img tags replaced
 */
export function convertInlineImages(text: string): string {
    const regex = /(?:&lt;|<)img\s[\S\s]*?\bsrc="(\S+?)"[\S\s]*?(?:&gt;|>)(\s?)/g;
    return text.replace(regex, trailingSpace);
}

/**
 * Replace Markdown image links with just the image URL.
 *
 * @param text string with Markdown
 * @return string with image URLs
 */
export function convertImageLinks(text: string): string {
    return text.replace(/!\[.*?\]\((.+?)\)(\s?)/g, trailingSpace);
}

/**
 * Replace Markdown links with Slack markup links.
 *
 * @param text string with Markdown
 * @return string with Slack markup
 */
export function convertLinks(text: string): string {
    return text.replace(/\[(.+?)\]\((.+?)\)/g, "<$2|$1>");
}

/**
 * Replace Markdown bold, italic, and unordered lists with their Slack
 * markup equivalent.
 *
 * @param text string with Markdown
 * @return string with Slack markup
 */
export function convertFormat(text: string): string {
    return text.replace(/^(\s*)[-*](\s+)/mg, "$1•$2")
        .replace(/(\*|_)\1(\S|\S.*?\S)\1\1(?!\1)/g, "<bdmkd>$2<bdmkd>")
        .replace(/(\*|_)(?!\1)(\S|\S.*?\S)\1(?!\1)/g, "<itmkd>$2<itmkd>")
        .replace(/<bdmkd>/g, "*")
        .replace(/<itmkd>/g, "_");
}

/**
 * Convert sections of text from GitHub-flavored Markdown to Slack
 * message markup.  This function should not be passed inline code or
 * code blocks.  The ordering of the functions called is significant.
 *
 * @param text string containing Markdown
 * @return string converted to Slack markup
 */
function convertMarkdown(text: string): string {
    try {
        return convertLinks(
            convertImageLinks(
                convertInlineImages(
                    convertNamedLinks(
                        convertFormat(text)))));
    } catch (e) {
        const err = e as Error;
        console.error(`replace failed:${err.name}:${err.message}:${err.stack}`);
        return text;
    }
}

/**
 * Convert GitHub-flavored Markdown to Slack message markup.  This is
 * not a complete implementation of a Markdown parser, but it does its
 * level best.
 *
 * @param text string containing markdown
 * @return string with Slack markup
 */
export function githubToSlack(text: string): string {
    const splitRegex = /(```[\S\s]*?```(?!`)|`.*?`)/mg;
    const hunks = text.split(splitRegex);
    for (let i = 0; i < hunks.length; i += 2) {
        hunks[i] = convertMarkdown(hunks[i]);
    }
    return hunks.join("");
}
