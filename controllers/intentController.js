const db = require('../db');
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const analyzeIntent = async (req, res) => {
    const customerId = req.user.id;
    const { prompt } = req.body;

    if (!prompt || !prompt.trim()) {
        return res.status(400).json({
            message: 'Prompt is required'
        });
    }

    try {
        // 1. Get the real services from the database
        const serviceSql = `
            SELECT
                services.id,
                services.name,
                services.description,
                services.duration_minutes,
                services.price,
                services.provider_id,
                categories.name AS category_name,
                users.first_name AS provider_first_name,
                users.last_name AS provider_last_name
            FROM services
            JOIN categories
                ON services.category_id = categories.id
            JOIN users
                ON services.provider_id = users.id
            ORDER BY services.id
        `;

        db.query(serviceSql, async (err, services) => {
            if (err) {
                console.error('Error fetching services:', err);

                return res.status(500).json({
                    message: 'Database error'
                });
            }

            if (services.length === 0) {
                return res.status(404).json({
                    message: 'No services available'
                });
            }

            try {
                // 2. Give Gemini only the real services
                const serviceCatalog = services.map((service) => ({
                    id: service.id,
                    name: service.name,
                    description: service.description,
                    category: service.category_name
                }));

                const response = await ai.models.generateContent({
                    model: 'gemini-3.6-flash',

                    contents: `
User request:
${prompt}

Available services:
${JSON.stringify(serviceCatalog)}
                    `,

                    config: {
                        systemInstruction: `
You analyze service booking requests written in Greek.

You must select the most appropriate service ONLY from
the available services provided to you.

Do not invent a new service.

Return:
- serviceId: the ID of the best matching service
- confidence: a number between 0 and 1
                        `,

                        responseMimeType: 'application/json',

                        responseSchema: {
                            type: 'object',

                            properties: {
                                serviceId: {
                                    type: 'integer'
                                },

                                confidence: {
                                    type: 'number'
                                }
                            },

                            required: [
                                'serviceId',
                                'confidence'
                            ]
                        }
                    }
                });

                // 3. Read Gemini result
                const aiResult = JSON.parse(response.text);

                const serviceId = Number(aiResult.serviceId);
                const confidence = Number(aiResult.confidence);

                // 4. Make sure Gemini selected a real service
                const matchedService = services.find(
                    (service) => service.id === serviceId
                );

                if (!matchedService) {
                    return res.status(500).json({
                        message: 'AI selected an invalid service'
                    });
                }

                // 5. Save the intent
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
                        matchedService.category_name,
                        matchedService.name,
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

                        // 6. Return the real matched service
                        res.status(200).json({
                            message: 'Intent analyzed successfully',

                            intentLogId: result.insertId,

                            intent: {
                                category:
                                    matchedService.category_name,

                                service:
                                    matchedService.name,

                                confidence
                            },

                            matchedService: {
                                id: matchedService.id,
                                name: matchedService.name,
                                description:
                                    matchedService.description,
                                durationMinutes:
                                    matchedService.duration_minutes,
                                price: matchedService.price,

                                provider: {
                                    id:
                                        matchedService.provider_id,
                                    firstName:
                                        matchedService.provider_first_name,
                                    lastName:
                                        matchedService.provider_last_name
                                }
                            }
                        });
                    }
                );

            } catch (error) {
                console.error('Gemini error:', error);

                return res.status(500).json({
                    message: 'AI service error'
                });
            }
        });

    } catch (error) {
        console.error('Intent analysis error:', error);

        res.status(500).json({
            message: 'Internal server error'
        });
    }
};

module.exports = {
    analyzeIntent
};