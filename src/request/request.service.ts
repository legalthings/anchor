import { Injectable, HttpService } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import { LoggerService } from '../logger/logger.service';
import { AxiosRequestConfig, AxiosResponse } from 'axios';

@Injectable()
export class RequestService {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) { }

  send(config: AxiosRequestConfig): Promise<AxiosResponse | Error> {
    const url = config.url;
    const method = config.method;

    try {
      return this.http.request(config as any).toPromise();
    } catch (e) {
      this.log(e, method, url);
      return e;
    }
  }

  async get<T>(url: string, config: AxiosRequestConfig = {}): Promise<AxiosResponse<T> | Error> {
    config.method = 'get';
    config.url = url;
    return await this.send(config);
  }

  async delete(url: string, config: AxiosRequestConfig = {}): Promise<AxiosResponse | Error> {
    config.method = 'delete';
    config.url = url;
    return await this.send(config);
  }

  async head(url: string, config: AxiosRequestConfig = {}): Promise<AxiosResponse | Error> {
    config.method = 'head';
    config.url = url;
    return await this.send(config);
  }

  async post(url: string, data?: any, config: AxiosRequestConfig = {}): Promise<AxiosResponse | Error> {
    config.method = 'post';
    config.url = url;
    config.data = data;
    return await this.send(config);
  }

  async put(url: string, data?: any, config: AxiosRequestConfig = {}): Promise<AxiosResponse | Error> {
    config.method = 'put';
    config.url = url;
    config.data = data;
    return await this.send(config);
  }

  async patch(url: string, data?: any, config: AxiosRequestConfig = {}): Promise<AxiosResponse | Error> {
    config.method = 'patch';
    config.url = url;
    config.data = data;
    return await this.send(config);
  }

  private log(e, method, url) {
    this.logger.error(`request: failed send '${method}: ${url}', error: '${e}'`, {
      stack: e.stack,
      response: e.response ? e.response.data : undefined,
    });
  }
}
