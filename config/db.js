import dotenv from 'dotenv'
import pg from 'pg';
dotenv.config();
const {Pool}=pg;
const pool=new Pool({
    connectionString:process.env.DB_URL,
    ssl:{
        rejectUnauthorized:false // Disable certificate verification (for testing)
    } 
})
export default pool;