import { NextResponse } from 'next/server';

export async function POST(req) {
    try {
        const { visitorName, visitorCompany, recipientName, recipientEmail, message } = await req.json();

        // 1. Send Instant Microsoft Teams Alert
        const teamsWebhookUrl = process.env.TEAMS_WEBHOOK_URL;

        if (teamsWebhookUrl) {
            await fetch(teamsWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: "message",
                    attachments: [
                        {
                            contentType: "application/vnd.microsoft.card.adaptive",
                            content: {
                                $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
                                type: "AdaptiveCard",
                                version: "1.2",
                                body: [
                                    {
                                        type: "TextBlock",
                                        text: "🔔 Visitor Arrived at Office Door!",
                                        weight: "Bolder",
                                        size: "Large",
                                        color: "Warning"
                                    },
                                    {
                                        type: "FactSet",
                                        facts: [
                                            { title: "Visitor:", value: visitorName },
                                            { title: "Organization:", value: visitorCompany || "N/A" },
                                            { title: "Visiting:", value: recipientName },
                                            { title: "Note/Reason:", value: message || "No extra note provided" }
                                        ]
                                    }
                                ]
                            }
                        }
                    ]
                })
            });
        }

        return NextResponse.json({ success: true, message: "Notification dispatched successfully!" });
    } catch (err) {
        console.error("Failed to dispatch visitor notification:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}