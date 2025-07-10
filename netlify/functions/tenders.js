const { Pool } = require('pg');

let pool;

exports.handler = async (event, context) => {
  // Initialize pool inside handler to ensure environment variables are available
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL is not set');
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Database configuration error' }),
      };
    }
    
    try {
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false
        }
      });
    } catch (error) {
      console.error('Pool creation error:', error);
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Database connection error' }),
      };
    }
  }
  const { httpMethod, path, body, pathParameters } = event;
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight requests
  if (httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Extract ID from path if present
    const pathParts = path.split('/');
    const id = pathParts[pathParts.length - 1] !== 'tenders' ? pathParts[pathParts.length - 1] : null;

    switch (httpMethod) {
      case 'GET':
        const getResult = await pool.query('SELECT * FROM tenders ORDER BY created_at DESC');
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(getResult.rows),
        };

      case 'POST':
        const { tender_number, description, closing_date, site_visits } = JSON.parse(body);
        const postResult = await pool.query(
          'INSERT INTO tenders (tender_number, description, closing_date, site_visits) VALUES ($1, $2, $3, $4) RETURNING *',
          [tender_number, description, closing_date, site_visits]
        );
        return {
          statusCode: 201,
          headers,
          body: JSON.stringify(postResult.rows[0]),
        };

      case 'PUT':
        if (!id) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'ID is required for update' }),
          };
        }
        const updateData = JSON.parse(body);
        const putResult = await pool.query(
          'UPDATE tenders SET tender_number = $1, description = $2, closing_date = $3, site_visits = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *',
          [updateData.tender_number, updateData.description, updateData.closing_date, updateData.site_visits, id]
        );
        if (putResult.rows.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Tender not found' }),
          };
        }
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(putResult.rows[0]),
        };

      case 'DELETE':
        if (!id) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'ID is required for delete' }),
          };
        }
        const deleteResult = await pool.query('DELETE FROM tenders WHERE id = $1 RETURNING *', [id]);
        if (deleteResult.rows.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Tender not found' }),
          };
        }
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: 'Tender deleted successfully' }),
        };

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
