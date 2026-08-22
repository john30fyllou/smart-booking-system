const db = require('../db');
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const analyzeIntent = async (req, res) => {
    const customerId = req.user.id;
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({
            message: 'Prompt is required'
        });
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',

            contents: prompt,

            config: {
                systemInstruction: `
                    You analyze service booking requests written in Greek.

                    Your task is to identify:
                    1. The most appropriate service category.
                    2. The service the user is requesting.
                    3. A confidence score between 0 and 1.

                    Available categories:
                    - Ομορφιά
                    - Υγεία
                    - Επαγγελματικές Υπηρεσίες

                    Respond in Greek.
                `,

                responseMimeType: 'application/json',

                responseSchema: {
                    type: 'object',

                    properties: {
                        category: {
                            type: 'string'
                        },

                        service: {
                            type: 'string'
                        },

                        confidence: {
                            type: 'number'
                        }
                    },

                    required: [
                        'category',
                        'service',
                        'confidence'
                    ]
                }
            }
        });

        const aiResult = JSON.parse(response.text);

        const {
            category,
            service,
            confidence
        } = aiResult;

        const insertSql = `
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
            insertSql,
            [
                customerId,
                prompt,
                category,
                service,
                confidence
            ],
            (err, result) => {
                if (err) {
                    console.error(
                        'Error saving intent log:',
                        err
                    );

                    return res.status(500).json({
                        message: 'Database error'
                    });
                }

                res.status(200).json({
                    message: 'Intent analyzed successfully',
                    intentLogId: result.insertId,

                    result: {
                        category,
                        service,
                        confidence
                    }
                });
            }
        );

    } catch (error) {
        console.error('Gemini error:', error);

        res.status(500).json({
            message: 'AI service error'
        });
    }
};

module.exports = {
    analyzeIntent
};