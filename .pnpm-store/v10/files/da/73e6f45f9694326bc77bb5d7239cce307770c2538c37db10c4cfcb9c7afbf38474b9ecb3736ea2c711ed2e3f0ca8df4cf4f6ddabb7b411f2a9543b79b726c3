class StringIdGenerator {
  chars;
  ids = [0];
  constructor(chars = "abcdefghijklmnopqrstuvwxyz") {
    this.chars = chars;
  }
  next() {
    const idsChars = this.ids.map((id) => this.chars[id]);
    this.increment();
    return idsChars.join("");
  }
  increment() {
    for (let i = this.ids.length - 1; i >= 0; i -= 1) {
      this.ids[i] += 1;
      if (this.ids[i] < this.chars.length) {
        return;
      }
      this.ids[i] = 0;
    }
    this.ids.unshift(0);
  }
}
export {
  StringIdGenerator
};
