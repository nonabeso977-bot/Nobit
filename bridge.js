function askNobitBrain(text) {
    const result = brainReply(text);

    if (result) {
        return result;
    }

    return null;
}


function askMemory(text) {
    const result = memoryReply(text);

    if (result) {
        return result;
    }

    return null;
}
