import { UsersRepository } from '../repository/users.repository';
import { UserEntity, User, CreateUserDto, UpdateUserDto, LoginDto } from '../domain/types';
import { entityToUser } from '../utils/users.utils';
import { deleteCache, getCache, setCache } from '@/shared/cache/redis.client';

export class UsersService {
  constructor(private repository: UsersRepository) {}

  /**
   * Get all users
   */
  async getAllUsers(filters?: {
    role?: string;
    isActive?: boolean;
  }): Promise<User[]> {
    const entities = await this.repository.findAll(filters);
    return entities.map(entityToUser);
  }

  /**
   * Get user by ID
   */
  async getUserById(id: number): Promise<User | null> {
    const cacheKey = `user:id:${id}`;
    
    const cached = await getCache<User>(cacheKey);
    if (cached) return cached;

    const entity = await this.repository.findById(id);
    if (!entity) return null;

    const user = entityToUser(entity);
    await setCache(cacheKey, user, 300); // Cache for 5 minutes
    return user;
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const entity = await this.repository.findByEmail(email);
    if (!entity) return null;
    return entityToUser(entity);
  }

  /**
   * Create user
   */
  async createUser(data: CreateUserDto): Promise<User> {
    // Check if email exists
    const emailExists = await this.repository.emailExists(data.email);
    if (emailExists) {
      throw new Error(`User with email "${data.email}" already exists`);
    }

    const entity = await this.repository.create(data);
    const user = entityToUser(entity);
    await setCache(`user:id:${user.id}`, user, 300);
    return user;
  }

  /**
   * Update user
   */
  async updateUser(id: number, data: UpdateUserDto): Promise<User> {
    // If email is being updated, check if it exists
    if (data.email) {
      const emailExists = await this.repository.emailExists(data.email, id);
      if (emailExists) {
        throw new Error(`User with email "${data.email}" already exists`);
      }
    }

    const entity = await this.repository.update(id, data);
    const user = entityToUser(entity);
    await setCache(`user:id:${id}`, user, 300);
    return user;
  }

  /**
   * Update password
   */
  async updatePassword(id: number, newPassword: string): Promise<void> {
    await this.repository.updatePassword(id, newPassword);
    await deleteCache(`user:id:${id}`);
  }

  /**
   * Delete user
   */
  async deleteUser(id: number): Promise<void> {
    await this.repository.delete(id);
    await deleteCache(`user:id:${id}`);
  }

  /**
   * Login user
   */
  async login(credentials: LoginDto): Promise<{ user: User; entity: UserEntity }> {
    const entity = await this.repository.findByEmail(credentials.email);
    
    if (!entity) {
      throw new Error('Invalid email or password');
    }

    if (!entity.is_active) {
      throw new Error('User account is inactive');
    }

    const isValidPassword = await this.repository.verifyPassword(entity, credentials.password);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await this.repository.updateLastLogin(entity.id);

    const user = entityToUser(entity);
    return { user, entity };
  }
}

