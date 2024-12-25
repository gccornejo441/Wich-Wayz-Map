import { VercelRequest, VercelResponse } from '@vercel/node';
import { tursoClient } from '../webhook';
import { VoteResponse } from '../types';


export default async function getVotesForShop(req: VercelRequest, res: VercelResponse) {
    const { shop_id } = req.query;

    if (typeof shop_id !== 'string') {
        res.status(400).json({ message: 'Invalid shop_id parameter' });
        return;
    }

    const query = `
        SELECT
            SUM(CASE WHEN upvote = 1 THEN 1 ELSE 0 END) AS upvotes,
            SUM(CASE WHEN downvote = 1 THEN 1 ELSE 0 END) AS downvotes
        FROM votes
        WHERE shop_id = ?
    `;

    try {
        const result = await tursoClient.execute({
            sql: query,
            args: [parseInt(shop_id, 10)]
        });

        const rows = result.rows;
        if (rows.length === 0) {
            res.status(200).json({
                shop_id: parseInt(shop_id, 10),
                upvotes: 0,
                downvotes: 0
            });
            return;
        }

        const row = rows[0];
        
        const voteResponse: VoteResponse = {
            shop_id: parseInt(shop_id, 10),
            upvotes: Number(row[0]) || 0,
            downvotes: Number(row[1]) || 0
        };

        res.status(200).json(voteResponse);
    } catch (err) {
        console.error('Database error during vote retrieval:', err);
        res.status(500).json({ message: 'Failed to retrieve votes.' });
    }
}