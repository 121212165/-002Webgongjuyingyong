import { User } from '../types';
import { storageService } from './storage';

// 认证服务类
export class AuthService {
  constructor() {}

  // 用户注册
  register(username: string, email: string, password: string): User {
    // 检查用户名是否已存在
    const existingUsers = this.getUsers();
    if (existingUsers.some(user => user.username === username)) {
      throw new Error('用户名已存在');
    }
    
    if (existingUsers.some(user => user.email === email)) {
      throw new Error('邮箱已被注册');
    }

    // 创建新用户
    const newUser: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      username,
      email,
      password,
      createdAt: new Date()
    };

    // 保存用户到本地存储
    existingUsers.push(newUser);
    localStorage.setItem('users', JSON.stringify(existingUsers));

    // 自动登录
    this.login(username, password);

    return newUser;
  }

  // 用户登录
  login(username: string, password: string): User {
    const existingUsers = this.getUsers();
    const user = existingUsers.find(u => u.username === username && u.password === password);

    if (!user) {
      throw new Error('用户名或密码错误');
    }

    // 保存当前用户到本地存储
    localStorage.setItem('currentUser', JSON.stringify(user));
    return user;
  }

  // 用户登出
  logout(): void {
    localStorage.removeItem('currentUser');
  }

  // 获取当前用户
  getCurrentUser(): User | null {
    const currentUser = localStorage.getItem('currentUser');
    return currentUser ? JSON.parse(currentUser) : null;
  }

  // 检查用户是否已登录
  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  // 获取所有用户
  private getUsers(): User[] {
    const users = localStorage.getItem('users');
    return users ? JSON.parse(users) : [];
  }
}

// 导出单例实例
export const authService = new AuthService();
