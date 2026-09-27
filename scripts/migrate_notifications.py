import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient

async def migrate_db(uri: str, db_name: str):
    print(f"Connecting to {db_name} at {uri[:25]}...")
    try:
        client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=5000)
        db = client[db_name]
        notifs = await db['notifications'].find({'category': 'connection_accepted'}).to_list(200)
        print(f"Found {len(notifs)} connection_accepted notifications in {db_name}")
        
        for n in notifs:
            payload = n.get('actionPayload') or {}
            req_id = payload.get('requestId')
            peer_name = payload.get('peerName')
            peer_id = payload.get('peerId')
            
            if not peer_id and req_id:
                conn = await db['connections'].find_one({'id': req_id})
                if conn:
                    user_id = n.get('userId')
                    peer_id = conn.get('receiverId') if conn.get('requesterId') == user_id else conn.get('requesterId')
            
            if not peer_id and peer_name:
                user = await db['users'].find_one({'name': peer_name})
                if user:
                    peer_id = str(user.get('_id') or user.get('id'))
            
            if peer_id:
                new_url = f"/profile/{peer_id}"
                print(f"Updating notification {n['_id']} ({n.get('title')}): actionUrl -> {new_url}, peerId -> {peer_id}")
                await db['notifications'].update_one(
                    {'_id': n['_id']},
                    {
                        '$set': {
                            'actionUrl': new_url,
                            'actionPayload.peerId': peer_id
                        }
                    }
                )
    except Exception as e:
        print(f"Error migrating {db_name}: {e}")

async def main():
    # 1. Local Mongo
    await migrate_db('mongodb://localhost:27017', 'careerx_db')
    
    # 2. Atlas / Env Mongo if defined
    atlas_uri = os.environ.get('MONGODB_URI')
    if atlas_uri and 'mongodb+srv' in atlas_uri:
        await migrate_db(atlas_uri, 'careerx_db')

if __name__ == '__main__':
    asyncio.run(main())
