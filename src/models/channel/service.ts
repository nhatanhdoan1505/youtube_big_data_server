import { IChannel } from "./type";
import { Types } from "mongoose";
import Channel from "./schema";

export class ChannelService {
  async createChannel(params: any) {
    const _session = new Channel({
      ...params,
      _id: new Types.ObjectId(),
    });
    return await _session.save();
  }

  async filterChannel(query): Promise<IChannel[]> {
    return await Channel.find(query).lean();
  }

  async findChannel(query): Promise<IChannel> {
    return await Channel.findOne(query).lean();
  }

  async updateChannel(query, params): Promise<IChannel> {
    return await Channel.findOneAndUpdate(query, params, { new: true }).lean();
  }

  async deleteChannel(query) {
    return await Channel.deleteMany(query);
  }
}
