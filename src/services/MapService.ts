import { mapRepository } from '../repository/MapRespository';
import { MapDTO, CreateMapDTO, UpdateMapDTO, CreateMapConvert, UpdateMapConvert } from '../entities/Map';
import { CrudService } from './CrudService';
import { scriptReader } from '../utils/scriptReader';
import fs from 'fs';
import path from 'path';
import { groupMapRepositoryByIdMap } from '../repository/GroupMapRepository';
import { userMapRepository } from '../repository/UserMapRepository';

class MapService extends CrudService<MapDTO, CreateMapDTO, UpdateMapDTO> {
  async getMapsByName(query: string) {
    return await mapRepository.getMapsByName(query);
  }

  async getByGroupId(id: number) {
    return await mapRepository.getByGroupId(id);
  }


   async saveXmlFile(data: any) {
    const pathName = path.resolve(
      __dirname,
      '../../',
      `assets/xml/${data.name.toLowerCase().replace(' ', '-')}.xml`,
    );

    fs.writeFileSync(pathName, data.file.content);
  }

  async convertXmlFile(data: any): Promise<JSON | undefined> {
    return await scriptReader.convertXmlToJson(data);
  }

  async deleteOldFileXml(fileName: string) {
    const pathName = path.resolve(
      __dirname,
      '../../',
      `assets/xml/${fileName.toLowerCase().replace(' ', '-')}.xml`,
    );

    fs.unlinkSync(pathName);
  };

  override async update(id: number, data: UpdateMapConvert): Promise<any> {
    const newData: any = {
      name: data.name,
      url: data.url,
    }

    if (data.new_file === 'true' && data.last_file_name) {
      this.deleteOldFileXml(data.last_file_name);
      this.saveXmlFile({ name: data.files[0].name, file: data.files[0] })
      const mapJson = await this.convertXmlFile({ name: data.files[0].name, minify: true, file: data.files[0] });

      if (!mapJson) {
        throw new Error('Failed to convert JSON');
      }

      newData.tag = JSON.stringify(mapJson);
      newData.thumb_url = data.files[0].name;
    }


    return mapRepository.update(id, newData);

  }

  override async create(data: CreateMapConvert): Promise<any> {
    const newData: any = {
      name: data.name,
      url: data.url,
      id_owner: parseInt(`${data.id_owner}`),
    }

    this.saveXmlFile({ name: data.files[0].name, file: data.files[0] })
    const mapJson = await this.convertXmlFile({ name: data.files[0].name, minify: true, file: data.files[0] });

    if (!mapJson) {
      throw new Error('Failed to convert JSON');
    }

    newData.tag = JSON.stringify(mapJson);
    newData.thumb_url = data.files[0].name;

    return mapRepository.create(newData);
  }

  override async delete(id:number):Promise<any> {

   const mapSelected = await mapRepository.getById(id);

   if(!mapSelected){
    throw new Error('Map not found.')
   }

   this.deleteOldFileXml(mapSelected.thumb_url);
   await groupMapRepositoryByIdMap.deleteMany(id);
   await userMapRepository.deleteMany(id);
   return await mapRepository.delete(id);
  };

  async downloadMap(idMapa: number, res: any): Promise<any> {
    const mapResponse = await mapRepository.getById(idMapa);

    if (mapResponse) {
      
      const pathName = path.resolve(
        __dirname,
        '../../',
        `assets/xml/${mapResponse.thumb_url.toLowerCase().replace(' ', '-')}.xml`,
      );

      const fileName = `${mapResponse.thumb_url.toLowerCase().replace(' ', '-')}.xml`;

      res.setHeader(
        'Content-Disposition',
        `attachment; filename=${mapResponse.thumb_url.toLowerCase().replace(' ', '-')}.xml`,
      );
      res.setHeader('Content-disposition', 'attachment; filename=' + fileName);

      const buffer = fs.readFileSync(pathName);

      console.log('buffer', buffer);
      res.end(buffer);
    }
  }

  async downloadMapJson(idMapa: number, res: any): Promise<any> {
    const mapResponse = await mapRepository.getById(idMapa);

    if (mapResponse) {
      const mapJson = JSON.stringify({
        id_professor: mapResponse.id,
        id_mapa: mapResponse.id,
        mapa_json: JSON.parse(mapResponse.tag),
      });
      const pathName = path.resolve(
        __dirname,
        '../../',
        `assets/json/${mapResponse.name.toLowerCase().replace(' ', '-')}.json`,
      );

      fs.writeFileSync(pathName, mapJson);
      const fileName = `${mapResponse.name.toLowerCase().replace(' ', '-')}.json`;
      const fileStream = fs.createReadStream(pathName);

      res.setHeader(
        'Content-Disposition',
        `attachment; filename=${mapResponse.name.toLowerCase().replace(' ', '-')}.json`,
      );
      res.setHeader('Content-disposition', 'attachment; filename=' + fileName);

      const buffer = fs.readFileSync(pathName);

      console.log('buffer', buffer);
      res.end(buffer);

      fs.unlinkSync(pathName);
    }
  }


  async findAllPaged(page: string, limit: string, search: string): Promise<any | null> {
    const users = await mapRepository.getAllPaged(page, limit, search);
    const count = await mapRepository.countAll();

    const take = limit ? Number(limit) : users.length;
    return { data: users, limit: take, page: Number(page), count };
  }
}

export const mapService = new MapService(mapRepository);
