function askNobitBrain(text) {
    const safety = globalThis.NobitSafety?.inspect(text);
    if (safety && !safety.allowed) return safety.reply;
    const result = brainReply(text);

    if (result) {
        return result;
    }

    return null;
}


function askMemory(text) {
    const safety = globalThis.NobitSafety?.inspect(text);
    if (safety && !safety.allowed) return safety.reply;
    const result = memoryReply(text);

    if (result) {
        return result;
    }

    return null;
}
