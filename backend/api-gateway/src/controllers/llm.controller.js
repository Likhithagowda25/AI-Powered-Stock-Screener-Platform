const { translateNLToDSL } = require("../services/llm_stub/llm_stub");

// Controller for the LLM route
const translateQuery = (req, res) => {
    const { query } = req.body;

    if (!query) {
        return res.status(400).json({ error: "Query is required" });
    }

    const dsl = translateNLToDSL(query);
    res.json({ dsl });
};

module.exports = { translateQuery };