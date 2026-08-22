const db = require('../db');

const analyzeIntent = (req, res) => {
    const customerId = req.user.id;
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({
            message: 'Prompt is required'
        });
    }

    // Temporary mock result.
    // Later this will be replaced by an LLM API call.
    const detectedCategory = 'Ομορφιά';
    const detectedService = 'Ανδρικό Κούρεμα';
    const confidence = 0.95;

    const sql = `
        INSERT INTO intent_logs
        (
            customer_id,
            user_prompt,
            detected_category,
            detected_service,
            confidence
        )
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            customerId,
            prompt,
            detectedCategory,
            detectedService,
            confidence
        ],
        (err, result) => {
            if (err) {
                console.error('Error saving intent log:', err);

                return res.status(500).json({
                    message: 'Database error'
                });
            }

            res.status(200).json({
                message: 'Intent analyzed successfully',
                intentLogId: result.insertId,
                result: {
                    category: detectedCategory,
                    service: detectedService,
                    confidence: confidence
                }
            });
        }
    );
};

module.exports = {
    analyzeIntent
};