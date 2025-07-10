const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

exports.handler = async (event, context) => {
  const { httpMethod, path, body } = event;
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
    const id = pathParts[pathParts.length - 1] !== 'tasks' ? pathParts[pathParts.length - 1] : null;

    switch (httpMethod) {
      case 'GET':
        const getResult = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(getResult.rows),
        };

      case 'POST':
        const { description, assigned_to, due_date, status } = JSON.parse(body);
        const postResult = await pool.query(
          'INSERT INTO tasks (description, assigned_to, due_date, status) VALUES ($1, $2, $3, $4) RETURNING *',
          [description, assigned_to, due_date, status || 'PENDING']
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
          'UPDATE tasks SET description = $1, assigned_to = $2, due_date = $3, status = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *',
          [updateData.description, updateData.assigned_to, updateData.due_date, updateData.status, id]
        );
        if (putResult.rows.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Task not found' }),
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
        const deleteResult = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [id]);
        if (deleteResult.rows.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Task not found' }),
          };
        }
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: 'Task deleted successfully' }),
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
