/**
 * 这是一个经过重构和修复的完整 worker.js 文件。
 * 它采用了更健壮的数据加载方式，彻底解决了语法错误。
 * 请将你的文件内容全部替换为以下代码。
 */

/**
 * 备用随机 SVG 图标 - 优化设计
 */
export const fallbackSVGIcons = [
  `<svg width="80" height="80" viewBox="0 0 24 24" fill="url(#gradient1)" xmlns="http://www.w3.org/2000/svg">
     <defs>
       <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
         <stop offset="0%" stop-color="#7209b7" />
         <stop offset="100%" stop-color="#4cc9f0" />
       </linearGradient>
     </defs>
     <path d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z"/>
   </svg>`,
  `<svg width="80" height="80" viewBox="0 0 24 24" fill="url(#gradient2)" xmlns="http://www.w3.org/2000/svg">
     <defs>
       <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
         <stop offset="0%" stop-color="#4361ee" />
         <stop offset="100%" stop-color="#4cc9f0" />
       </linearGradient>
     </defs>
     <circle cx="12" cy="12" r="10"/>
     <path d="M12 7v5l3.5 3.5 1.42-1.42L14 11.58V7h-2z" fill="#fff"/>
   </svg>`,
  `<svg width="80" height="80" viewBox="0 0 24 24" fill="url(#gradient3)" xmlns="http://www.w3.org/2000/svg">
     <defs>
       <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="100%">
         <stop offset="0%" stop-color="#7209b7" />
         <stop offset="100%" stop-color="#4361ee" />
       </linearGradient>
     </defs>
     <path d="M12 .587l3.668 7.431L24 9.172l-6 5.843 1.416 8.252L12 19.771l-7.416 3.496L6 15.015 0 9.172l8.332-1.154z"/>
   </svg>`,
];

function getRandomSVG() {
  return fallbackSVGIcons[Math.floor(Math.random() * fallbackSVGIcons.length)];
}

/**
 * 渲染单个网站卡片（优化版）
 */
function renderSiteCard(site) {
  const logoHTML = site.logo
    ? `<img src="${site.logo}" alt="${site.name}"/>`
    : getRandomSVG();

  return `
    <div class="channel-card" data-id="${site.id}" data-name="${site.name}" data-url="${site.url}" data-catalog="${site.catelog}">
      <div class="channel-number">${site.id}</div>
      <h3 class="channel-title">${site.name || '未命名'}</h3>
      <span class="channel-tag">${site.catelog}</span>
      <div class="logo-wrapper">${logoHTML}</div>
      <p class="channel-desc">${site.desc || '暂无描述'}</p>
      <a href="${site.url}" target="_blank" class="channel-link">${site.url}</a>
      <button class="copy-btn" data-url="${site.url}" title="复制链接">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      </button>
      <div class="copy-success">已复制!</div>
    </div>
  `;
}

/**
 * 处理 API 请求
 */
const api = {
  async handleRequest(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api', ''); // 去掉 "/api" 前缀
    const method = request.method;
    const id = url.pathname.split('/').pop(); // 获取最后一个路径段，作为 id (例如 /api/config/1)
    try {
      if (path === '/config') {
        switch (method) {
          case 'GET':
            return await this.getConfig(request, env, ctx, url);
          case 'POST':
            return await this.createConfig(request, env, ctx);
          default:
            return this.errorResponse('Method Not Allowed', 405)
        }
      }
      if (path === '/config/submit' && method === 'POST') {
        return await this.submitConfig(request, env, ctx);
      }
      if (path === `/config/${id}` && /^\d+$/.test(id)) {
        switch (method) {
          case 'PUT':
            return await this.updateConfig(request, env, ctx, id);
          case 'DELETE':
            return await this.deleteConfig(request, env, ctx, id);
          default:
            return this.errorResponse('Method Not Allowed', 405)
        }
      }
      if (path === `/pending/${id}` && /^\d+$/.test(id)) {
        switch (method) {
          case 'PUT':
            return await this.approvePendingConfig(request, env, ctx, id);
          case 'DELETE':
            return await this.rejectPendingConfig(request, env, ctx, id);
          default:
            return this.errorResponse('Method Not Allowed', 405)
        }
      }
      if (path === '/config/import' && method === 'POST') {
        return await this.importConfig(request, env, ctx);
      }
      if (path === '/config/export' && method === 'GET') {
        return await this.exportConfig(request, env, ctx);
      }
      if (path === '/pending' && method === 'GET') {
        return await this.getPendingConfig(request, env, ctx, url);
      }
      return this.errorResponse('Not Found', 404);
    } catch (error) {
      return this.errorResponse(`Internal Server Error: ${error.message}`, 500);
    }
  },
  async getConfig(request, env, ctx, url) {
    const catalog = url.searchParams.get('catalog');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10);
    const keyword = url.searchParams.get('keyword');
    const offset = (page - 1) * pageSize;
    try {
      let query = `SELECT * FROM sites`;
      let countQuery = `SELECT COUNT(*) as total FROM sites`;
      let queryBindParams = [];
      let countQueryParams = [];

      if (catalog) {
        query += ` WHERE catelog = ?`;
        countQuery += ` WHERE catelog = ?`;
        queryBindParams.push(catalog);
        countQueryParams.push(catalog);
      }

      if (keyword) {
        const likeKeyword = `%${keyword}%`;
        const whereClause = `(name LIKE ? OR url LIKE ? OR catelog LIKE ?)`;
        if (catalog) {
          query += ` AND ${whereClause}`;
          countQuery += ` AND ${whereClause}`;
          queryBindParams.push(likeKeyword, likeKeyword, likeKeyword);
          countQueryParams.push(likeKeyword, likeKeyword, likeKeyword);
        } else {
          query += ` WHERE ${whereClause}`;
          countQuery += ` WHERE ${whereClause}`;
          queryBindParams.push(likeKeyword, likeKeyword, likeKeyword);
          countQueryParams.push(likeKeyword, likeKeyword, likeKeyword);
        }
      }
      query += ` ORDER BY name ASC LIMIT ? OFFSET ?`;
      queryBindParams.push(pageSize, offset);

      const { results } = await env.NAV_DB.prepare(query).bind(...queryBindParams).all();
      const countResult = await env.NAV_DB.prepare(countQuery).bind(...countQueryParams).first();
      const total = countResult ? countResult.total : 0;
      return new Response(
        JSON.stringify({
          code: 200,
          data: results,
          total,
          page,
          pageSize
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    } catch (e) {
      return this.errorResponse(`Failed to fetch config data: ${e.message}`, 500)
    }
  },
  async getPendingConfig(request, env, ctx, url) {
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10);
    const offset = (page - 1) * pageSize;
    try {
      const { results } = await env.NAV_DB.prepare(`
                        SELECT * FROM pending_sites ORDER BY name ASC LIMIT ? OFFSET ?
                    `).bind(pageSize, offset).all();
      const countResult = await env.NAV_DB.prepare(`
                      SELECT COUNT(*) as total FROM pending_sites
                      `).first();
      const total = countResult ? countResult.total : 0;
      return new Response(
        JSON.stringify({
          code: 200,
          data: results,
          total,
          page,
          pageSize
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    } catch (e) {
      return this.errorResponse(`Failed to fetch pending config data: ${e.message}`, 500);
    }
  },
  async approvePendingConfig(request, env, ctx, id) {
    try {
      const { results } = await env.NAV_DB.prepare('SELECT * FROM pending_sites WHERE id = ?').bind(id).all();
      if (results.length === 0) {
        return this.errorResponse('Pending config not found', 404);
      }
      const config = results[0];
      await env.NAV_DB.prepare(`
                    INSERT INTO sites (name, url, logo, desc, catelog)
                    VALUES (?, ?, ?, ?, ?)
              `).bind(config.name, config.url, config.logo, config.desc, config.catelog).run();
      await env.NAV_DB.prepare('DELETE FROM pending_sites WHERE id = ?').bind(id).run();

      return new Response(JSON.stringify({
        code: 200,
        message: 'Pending config approved successfully'
      }), {
        headers: {
          'Content-Type': 'application/json'
        }
      })
    } catch (e) {
      return this.errorResponse(`Failed to approve pending config : ${e.message}`, 500);
    }
  },
  async rejectPendingConfig(request, env, ctx, id) {
    try {
      await env.NAV_DB.prepare('DELETE FROM pending_sites WHERE id = ?').bind(id).run();
      return new Response(JSON.stringify({
        code: 200,
        message: 'Pending config rejected successfully',
      }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      return this.errorResponse(`Failed to reject pending config: ${e.message}`, 500);
    }
  },
  async submitConfig(request, env, ctx) {
    try {
      const config = await request.json();
      const { name, url, logo, desc, catelog } = config;
      if (!name || !url || !catelog) {
        return this.errorResponse('Name, URL and Catelog are required', 400);
      }
      await env.NAV_DB.prepare(`
                  INSERT INTO pending_sites (name, url, logo, desc, catelog)
                  VALUES (?, ?, ?, ?, ?)
            `).bind(name, url, logo, desc, catelog).run();
      return new Response(JSON.stringify({
        code: 201,
        message: 'Config submitted successfully, waiting for admin approve',
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (e) {
      return this.errorResponse(`Failed to submit config : ${e.message}`, 500);
    }
  },

  async createConfig(request, env, ctx) {
    try {
      const config = await request.json();
      const { name, url, logo, desc, catelog } = config;
      if (!name || !url || !catelog) {
        return this.errorResponse('Name, URL and Catelog are required', 400);
      }
      const insert = await env.NAV_DB.prepare(`
                    INSERT INTO sites (name, url, logo, desc, catelog)
                    VALUES (?, ?, ?, ?, ?)
              `).bind(name, url, logo, desc, catelog).run();
      return new Response(JSON.stringify({
        code: 201,
        message: 'Config created successfully',
        insert
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (e) {
      return this.errorResponse(`Failed to create config : ${e.message}`, 500);
    }
  },

  async updateConfig(request, env, ctx, id) {
    try {
      const config = await request.json();
      const { name, url, logo, desc, catelog } = config;
      const update = await env.NAV_DB.prepare(`
                UPDATE sites
                SET name = ?, url = ?, logo = ?, desc = ?, catelog = ?, update_time = CURRENT_TIMESTAMP
                WHERE id = ?
            `).bind(name, url, logo, desc, catelog, id).run();
      return new Response(JSON.stringify({
        code: 200,
        message: 'Config updated successfully',
        update
      }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      return this.errorResponse(`Failed to update config: ${e.message}`, 500);
    }
  },

  async deleteConfig(request, env, ctx, id) {
    try {
      const del = await env.NAV_DB.prepare('DELETE FROM sites WHERE id = ?').bind(id).run();
      return new Response(JSON.stringify({
        code: 200,
        message: 'Config deleted successfully',
        del
      }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      return this.errorResponse(`Failed to delete config: ${e.message}`, 500);
    }
  },
  async importConfig(request, env, ctx) {
    try {
      const jsonData = await request.json();
      if (!Array.isArray(jsonData)) {
        return this.errorResponse('Invalid JSON data. Must be an array of site configurations.', 400);
      }

      const insertStatements = jsonData.map(item =>
        env.NAV_DB.prepare(`
                        INSERT INTO sites (name, url, logo, desc, catelog)
                        VALUES (?, ?, ?, ?, ?)
                    `).bind(item.name, item.url, item.logo, item.desc, item.catelog)
      )

      // 使用 Promise.all 来并行执行所有插入操作
      await Promise.all(insertStatements.map(stmt => stmt.run()));
      return new Response(JSON.stringify({
        code: 201,
        message: 'Config imported successfully'
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return this.errorResponse(`Failed to import config : ${error.message}`, 500);
    }
  },

  async exportConfig(request, env, ctx) {
    try {
      const { results } = await env.NAV_DB.prepare('SELECT * FROM sites').all();
      return new Response(JSON.stringify({
        code: 200,
        data: results
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="config.json"'
        }
      });
    } catch (e) {
      return this.errorResponse(`Failed to export config: ${e.message}`, 500)
    }
  },
  errorResponse(message, status) {
    return new Response(JSON.stringify({ code: status, message: message }), {
      status: status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};


/**
 * 处理后台管理页面请求
 */
const admin = {
  async handleRequest(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/admin') {
      const params = url.searchParams;
      const name = params.get('name');
      const password = params.get('password');

      // 从KV中获取凭据
      const storedUsername = await env.NAV_AUTH.get("admin_username");
      const storedPassword = await env.NAV_AUTH.get("admin_password");
      if (name === storedUsername && password === storedPassword) {
        return this.renderAdminPage();
      } else if (name || password) {
        return new Response('未授权访问', {
          status: 403,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      } else {
        return this.renderLoginPage();
      }
    }

    if (url.pathname.startsWith('/static')) {
      return this.handleStatic(request, env, ctx);
    }

    return new Response('页面不存在', { status: 404 });
  },
  async handleStatic(request, env, ctx) {
    const url = new URL(request.url);
    const filePath = url.pathname.replace('/static/', '');

    let contentType = 'text/plain';
    if (filePath.endsWith('.css')) {
      contentType = 'text/css';
    } else if (filePath.endsWith('.js')) {
      contentType = 'application/javascript';
    }

    try {
      const fileContent = await this.getFileContent(filePath)
      return new Response(fileContent, {
        headers: { 'Content-Type': contentType }
      });
    } catch (e) {
      return new Response('Not Found', { status: 404 });
    }

  },
  async getFileContent(filePath) {
    const fileContents = {
      'admin.html': `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>书签管理页面</title>
      <link rel="stylesheet" href="/static/admin.css">
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&display=swap" rel="stylesheet">
    </head>
    <body>
      <div class="container">
          <h1></h1>
          <div class="import-export">
            <input type="file" id="importFile" accept=".json" style="display:none;">
            <button id="importBtn">导入</button>
            <button id="exportBtn">导出</button>
          </div>
          <div class="add-new">
            <input type="text" id="addName" placeholder="Name">
            <input type="text" id="addUrl" placeholder="URL">
            <input type="text" id="addLogo" placeholder="Logo(optional)">
             <input type="text" id="addDesc" placeholder="Description(optional)">
            <input type="text" id="addCatelog" placeholder="Catelog">
            <button id="addBtn">添加</button>
          </div>
          <div id="message" style="display: none;padding:1rem;border-radius: 0.5rem;margin-bottom: 1rem;"></div>
          <div class="tab-wrapper">
              <div class="tab-buttons">
                 <button class="tab-button active" data-tab="config">书签列表</button>
                 <button class="tab-button" data-tab="pending">待审核列表</button>
              </div>
              <div id="config" class="tab-content active">
                    <div class="table-wrapper">
                        <table id="configTable">
                            <thead>
                                <tr>
                                  <th>ID</th>
                                  <th>Name</th>
                                  <th>URL</th>
                                  <th>Logo</th>
                                  <th>Description</th>
                                  <th>Catelog</th>
                                  <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="configTableBody">
                              </tbody>
                        </table>
                        <div class="pagination">
                              <button id="prevPage" disabled>上一页</button>
                              <span id="currentPage">1</span>/<span id="totalPages">1</span>
                              <button id="nextPage" disabled>下一页</button>
                        </div>
                   </div>
               </div>
               <div id="pending" class="tab-content">
                 <div class="table-wrapper">
                   <table id="pendingTable">
                      <thead>
                        <tr>
                            <th>ID</th>
                             <th>Name</th>
                             <th>URL</th>
                             <th>Logo</th>
                            <th>Description</th>
                            <th>Catelog</th>
                            <th>Actions</th>
                        </tr>
                        </thead>
                        <tbody id="pendingTableBody">
                          </tbody>
                    </table>
                     <div class="pagination">
                      <button id="pendingPrevPage" disabled>上一页</button>
                      <span id="pendingCurrentPage">1</span>/<span id="pendingTotalPages">1</span>
                      <button id="pendingNextPage" disabled>下一页</button>
                    </div>
                 </div>
               </div>
          </div>
      </div>
      <script src="/static/admin.js"></script>
    </body>
    </html>`,
      'admin.css': `body {
        font-family: 'Noto Sans SC', sans-serif;
        margin: 0;
        padding: 20px;
        background-color: #f8f9fa; /* 更柔和的背景色 */
        color: #212529; /* 深色文字 */
    }
    .modal {
        display: none;
        position: fixed;
        z-index: 1000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        overflow: auto;
        background-color: rgba(0, 0, 0, 0.5); /* 半透明背景 */
    }
    .modal-content {
        background-color: #fff; /* 模态框背景白色 */
        margin: 10% auto;
        padding: 20px;
        border: 1px solid #dee2e6; /* 边框 */
        width: 60%;
        border-radius: 8px;
        position: relative;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1); /* 阴影效果 */
    }
    .modal-close {
        color: #6c757d; /* 关闭按钮颜色 */
        position: absolute;
        right: 10px;
        top: 0;
        font-size: 28px;
        font-weight: bold;
        cursor: pointer;
        transition: color 0.2s;
    }
    
    .modal-close:hover,
    .modal-close:focus {
        color: #343a40; /* 悬停时颜色加深 */
        text-decoration: none;
        cursor: pointer;
    }
    .modal-content form {
        display: flex;
        flex-direction: column;
    }
    .modal-content form label {
        margin-bottom: 5px;
        font-weight: 500; /* 字重 */
        color: #495057; /* 标签颜色 */
    }
    .modal-content form input {
        margin-bottom: 10px;
        padding: 10px;
        border: 1px solid #ced4da; /* 输入框边框 */
        border-radius: 4px;
        font-size: 1rem;
        outline: none;
        transition: border-color 0.2s;
    }
    .modal-content form input:focus {
        border-color: #80bdff; /* 焦点边框颜色 */
        box-shadow:0 0 0 0.2rem rgba(0,123,255,.25);
    }
    .modal-content form input:focus {
        border-color: #80bdff; /* 焦点边框颜色 */
