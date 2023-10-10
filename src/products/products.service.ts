import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from 'src/common/dtos/pagination.dto';

import { validate as isUUID } from 'uuid';
import { ProductImage, Product } from './entities';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class ProductsService {

  private readonly logger = new Logger('ProductsService');

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,

    private readonly dataSource: DataSource,
  ) { }

  public async create(createProductDto: CreateProductDto, user: User) {
    try {
      const { images = [], ...productDetails } = createProductDto;

      const product = this.productRepository.create({
        ...productDetails,
        images: images.map( image => this.productImageRepository.create({ url: image }) ),
        user,
      });

      await this.productRepository.save(product);

      return { ...product, images };

    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  // TODO: Paginar
  public async findAll(paginationDto: PaginationDto) {
    const { limit = 3, offset = 0 } = paginationDto;
    const products = await this.productRepository.find({
      where: {
        isvigente: true,
      },
      take: limit,
      skip: offset,
      relations: {
        images: true,
      }
    });

    return products.map((product) => ({
      ...product,
      images: product.images.map(img => img.url)
    }))
  }

  public async findOne(term: string) {
    let isTermUUID: boolean = false;

    if (isUUID(term)) isTermUUID = true;

    console.log('term', term, 'isTermUUID: ' + isTermUUID);

    try {
      if (isTermUUID) {
        return await this.productRepository.findOneByOrFail({ id: term }); // isvigente: true
      }

      if (!isTermUUID) {
        const queryBuilder = this.productRepository.createQueryBuilder('prod');
        const product: Product = await queryBuilder
          .where('UPPER(title) =:title or slug =:slug and isvigente=:isvigente', {
            title: term.toUpperCase(),
            slug: term.toLowerCase()
            //isvigente: true
          })
          .leftJoinAndSelect('prod.images', 'prodImages')
          .getOne();

        return product;
      }
    } catch (error) {
      throw new NotFoundException(`Product with ${term} not found`);
    }

  }


  async update( id: string, updateProductDto: UpdateProductDto, user: User ) {
    // return await this.productRepository.createQueryBuilder()
    //   .update({
    //     id: id,
    //     ...updateProductDto
    //   })
    //   .where({ id: id })
    //   .execute();

    const { images, ...toUpdate } = updateProductDto;
    const product = await this.productRepository.preload({ id, ...toUpdate });

    if (!product) throw new NotFoundException(`Product with id: ${id} not found`);

    // Create query runner
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {

      if (images) {
        await queryRunner.manager.delete(ProductImage, { product: { id } });

        product.images = images.map(
          image => this.productImageRepository.create({ url: image })
        )
      }

      // await this.productRepository.save( product );
      
      product.user = user;
      
      await queryRunner.manager.save( product );

      await queryRunner.commitTransaction();
      await queryRunner.release();

      return this.findOnePlain(id);

    } catch (error) {

      console.log('error', error);

      await queryRunner.rollbackTransaction();
      await queryRunner.release();
      this.handleDBExceptions(error);
    }

  }

  public async findOnePlain(term: string) {
    const { images = [], ...rest } = await this.findOne(term);
    return {
      ...rest,
      images: images.map(image => image.url)
    }
  }

  public async remove(id: string) {
    const deleted = await this.productRepository.delete({ id: id });

    if (!deleted.affected)
      throw new NotFoundException();

    return { success: 'true', affectedCount: deleted.affected };
  }

  private handleDBExceptions(error: any) {

    if (error.code === '23505')
      throw new BadRequestException(error.detail);

    this.logger.error(error)
    // console.log(error)
    throw new InternalServerErrorException('Unexpected error, check server logs');

  }

  async deleteAllProducts() {
    const query = this.productRepository.createQueryBuilder('product');

    try {
      return await query
        .delete()
        .where({})
        .execute();

    } catch (error) {
      this.handleDBExceptions(error);
    }
  }
}