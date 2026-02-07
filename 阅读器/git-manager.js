/**
 * Git版本管理模块
 * 使用isomorphic-git库实现笔记的版本控制功能
 */

class GitManager {
    constructor() {
        this.git = require('isomorphic-git');
        this.fs = require('fs');
        this.path = require('path');
        this.repoPath = null;
        this.initialized = false;
    }

    /**
     * 初始化Git仓库
     * @param {string} repoPath - 仓库路径
     */
    async initialize(repoPath) {
        try {
            this.repoPath = repoPath;
            
            // 检查是否已经是Git仓库
            const gitDir = this.path.join(repoPath, '.git');
            if (!this.fs.existsSync(gitDir)) {
                // 初始化新的Git仓库
                await this.git.init({
                    fs: this.fs,
                    dir: repoPath,
                    defaultBranch: 'main'
                });
                
                // 创建初始提交
                await this.createInitialCommit();
                console.log('Git仓库初始化成功');
            } else {
                console.log('Git仓库已存在');
            }
            
            this.initialized = true;
            return { success: true };
        } catch (error) {
            console.error('Git仓库初始化失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 创建初始提交
     */
    async createInitialCommit() {
        try {
            // 创建.gitignore文件
            const gitignoreContent = `# 忽略临时文件
*.tmp
*.log

# 忽略系统文件
.DS_Store
Thumbs.db

# 忽略node_modules
node_modules/
`;
            const gitignorePath = this.path.join(this.repoPath, '.gitignore');
            this.fs.writeFileSync(gitignorePath, gitignoreContent);

            // 添加文件到暂存区
            await this.git.add({
                fs: this.fs,
                dir: this.repoPath,
                filepath: '.gitignore'
            });

            // 创建初始提交
            await this.git.commit({
                fs: this.fs,
                dir: this.repoPath,
                message: '初始提交：创建阅读器笔记仓库',
                author: {
                    name: '阅读器用户',
                    email: 'user@reader.local'
                }
            });
        } catch (error) {
            console.error('创建初始提交失败:', error);
            throw error;
        }
    }

    /**
     * 添加文件到Git
     * @param {string} filepath - 文件路径（相对于仓库根目录）
     */
    async addFile(filepath) {
        if (!this.initialized) {
            throw new Error('Git仓库未初始化');
        }

        try {
            await this.git.add({
                fs: this.fs,
                dir: this.repoPath,
                filepath: filepath
            });
            return { success: true };
        } catch (error) {
            console.error('添加文件失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 提交更改
     * @param {string} message - 提交信息
     * @param {Object} author - 作者信息
     */
    async commit(message, author = null) {
        if (!this.initialized) {
            throw new Error('Git仓库未初始化');
        }

        try {
            const commitAuthor = author || {
                name: '阅读器用户',
                email: 'user@reader.local'
            };

            const sha = await this.git.commit({
                fs: this.fs,
                dir: this.repoPath,
                message: message,
                author: commitAuthor
            });

            return { success: true, sha: sha };
        } catch (error) {
            console.error('提交失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 获取提交历史
     * @param {number} limit - 限制返回的提交数量
     */
    async getCommitHistory(limit = 10) {
        if (!this.initialized) {
            throw new Error('Git仓库未初始化');
        }

        try {
            const commits = await this.git.log({
                fs: this.fs,
                dir: this.repoPath,
                depth: limit
            });

            return {
                success: true,
                commits: commits.map(commit => ({
                    sha: commit.oid,
                    message: commit.commit.message,
                    author: commit.commit.author,
                    date: new Date(commit.commit.author.timestamp * 1000)
                }))
            };
        } catch (error) {
            console.error('获取提交历史失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 创建分支
     * @param {string} branchName - 分支名称
     */
    async createBranch(branchName) {
        if (!this.initialized) {
            throw new Error('Git仓库未初始化');
        }

        try {
            await this.git.branch({
                fs: this.fs,
                dir: this.repoPath,
                ref: branchName
            });

            return { success: true };
        } catch (error) {
            console.error('创建分支失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 切换分支
     * @param {string} branchName - 分支名称
     */
    async checkoutBranch(branchName) {
        if (!this.initialized) {
            throw new Error('Git仓库未初始化');
        }

        try {
            await this.git.checkout({
                fs: this.fs,
                dir: this.repoPath,
                ref: branchName
            });

            return { success: true };
        } catch (error) {
            console.error('切换分支失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 获取当前分支
     */
    async getCurrentBranch() {
        if (!this.initialized) {
            throw new Error('Git仓库未初始化');
        }

        try {
            const branch = await this.git.currentBranch({
                fs: this.fs,
                dir: this.repoPath
            });

            return { success: true, branch: branch };
        } catch (error) {
            console.error('获取当前分支失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 获取仓库状态
     */
    async getStatus() {
        if (!this.initialized) {
            throw new Error('Git仓库未初始化');
        }

        try {
            const status = await this.git.statusMatrix({
                fs: this.fs,
                dir: this.repoPath
            });

            const result = {
                modified: [],
                added: [],
                deleted: [],
                untracked: []
            };

            status.forEach(([filepath, headStatus, workdirStatus, stageStatus]) => {
                if (headStatus === 1 && workdirStatus === 2 && stageStatus === 1) {
                    result.modified.push(filepath);
                } else if (headStatus === 0 && workdirStatus === 2 && stageStatus === 0) {
                    result.untracked.push(filepath);
                } else if (headStatus === 1 && workdirStatus === 0 && stageStatus === 1) {
                    result.deleted.push(filepath);
                } else if (stageStatus === 2) {
                    result.added.push(filepath);
                }
            });

            return { success: true, status: result };
        } catch (error) {
            console.error('获取仓库状态失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 保存笔记并自动提交
     * @param {string} noteId - 笔记ID
     * @param {Object} noteData - 笔记数据
     */
    async saveNoteWithCommit(noteId, noteData) {
        if (!this.initialized) {
            throw new Error('Git仓库未初始化');
        }

        try {
            // 创建笔记文件路径
            const notesDir = this.path.join(this.repoPath, 'notes');
            if (!this.fs.existsSync(notesDir)) {
                this.fs.mkdirSync(notesDir, { recursive: true });
            }

            const noteFilePath = this.path.join(notesDir, `${noteId}.json`);
            const relativeFilePath = this.path.relative(this.repoPath, noteFilePath);

            // 保存笔记文件
            this.fs.writeFileSync(noteFilePath, JSON.stringify(noteData, null, 2));

            // 添加到Git
            await this.addFile(relativeFilePath);

            // 提交更改
            const commitMessage = `更新笔记: ${noteData.title || noteId}`;
            const result = await this.commit(commitMessage);

            return result;
        } catch (error) {
            console.error('保存笔记并提交失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 恢复笔记到指定版本
     * @param {string} noteId - 笔记ID
     * @param {string} commitSha - 提交SHA
     */
    async restoreNoteVersion(noteId, commitSha) {
        if (!this.initialized) {
            throw new Error('Git仓库未初始化');
        }

        try {
            const relativeFilePath = `notes/${noteId}.json`;
            
            // 获取指定版本的文件内容
            const { blob } = await this.git.readBlob({
                fs: this.fs,
                dir: this.repoPath,
                oid: commitSha,
                filepath: relativeFilePath
            });

            const noteData = JSON.parse(Buffer.from(blob).toString('utf8'));
            return { success: true, data: noteData };
        } catch (error) {
            console.error('恢复笔记版本失败:', error);
            return { success: false, error: error.message };
        }
    }
}

// 导出GitManager类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GitManager;
} else {
    window.GitManager = GitManager;
}