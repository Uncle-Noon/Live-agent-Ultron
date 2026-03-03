const processMessage = async (message) => {
  return `Intent received: ${message}`;
};

module.exports = { processMessage };