import { IChannel } from "models/channel/type";
import fs from "fs";
import * as _ from "lodash";
import { IHotChannel } from "models/channel-hot/type";
import { HotChannelService } from "../models/channel-hot/service";
import { ChannelService } from "../models/channel/service";
import { HotVideoService } from "../models/video-hot/service";
import { IHotVideo } from "../models/video-hot/type";
import {
  queryUploadStatistic,
  queryVideoViewDistribution,
} from "../utils/common";
import { queryChannelSubscriberStatistic } from "./../utils/common";

export class ChannelController {
  private channelService: ChannelService = new ChannelService();
  private hotVideoService: HotVideoService = new HotVideoService();
  private hotChannelService: HotChannelService = new HotChannelService();

  async refresh(req, res) {
    let channelList = await this.channelService.filterChannel({});
    channelList = channelList
      .filter((channel) => {
        let rep = channelList.filter((c) => c.id === channel.id).length;
        if (rep === 1) return channel;
        if (rep > 1 && channel.date.split("|").length > 1) return channel;
        else return null;
      })
      .filter((c) => c);
    await this.channelService.deleteChannel({});
    fs.writeFileSync("refresh.txt", JSON.stringify(channelList));
  }

  async getSystemInformation(req, res) {
    let views = (
      await this.hotChannelService.queryHotChannel([
        { $group: { _id: "", views: { $sum: "$views" } } },
        {
          $project: {
            _id: 0,
            views: "$views",
          },
        },
      ])
    )[0].views;
    let subscribers = (
      await this.hotChannelService.queryHotChannel([
        { $group: { _id: "", subscribe: { $sum: "$subscribe" } } },
        {
          $project: {
            _id: 0,
            subscribe: "$subscribe",
          },
        },
      ])
    )[0].subscribe;
    let numberVideos = (
      await this.hotChannelService.queryHotChannel([
        { $group: { _id: "", numberVideos: { $sum: "$numberVideos" } } },
        {
          $project: {
            _id: 0,
            numberVideos: "$numberVideos",
          },
        },
      ])
    )[0].numberVideos;

    let numberChannels = await this.hotChannelService.getTotalHotChannel();

    return res.status(200).json({
      status: "OK",
      msg: "OK",
      data: { views, subscribers, numberVideos, numberChannels },
    });
  }

  async deleteChannel(req, res) {
    const idList = (
      await this.channelService.queryChannel([
        { $group: { _id: "$id", count: { $sum: 1 } } },
      ])
    )
      .filter((d) => d.count > 1)
      .map((c) => c._id);
    const promise = idList.map((id) =>
      this.channelService.deleteChannel({ id })
    );
    await Promise.all(promise);
    return res.status(200).json({ status: "OK", msg: "OK", data: idList });
  }

  async getAllChannels(req, res) {
    const channels = await this.channelService.filterChannel({});
    return res.status(200).json({ status: "OK", data: channels });
  }

  async getChannelFromDBByLabel(req, res) {
    if (!req.body.label)
      return res
        .status(400)
        .json({ status: "FAIL", msg: "Insufficient parameter" });
    const channelData = await this.channelService.filterChannel({
      label: req.body.label,
    });
    return res.status(200).json({ status: "OK", data: channelData });
  }

  async getChannelFromDBById(req, res) {
    if (!req.body.id)
      return res
        .status(400)
        .json({ status: "FAIL", msg: "Insufficient parameter" });
    const channelData = await this.channelService.findChannel({
      id: req.body.id,
    });
    return res.status(200).json({ status: "OK", data: channelData });
  }

  async getAllLabel(req, res) {
    let labelList = (
      await this.channelService.queryChannel([{ $group: { _id: "$label" } }])
    ).map((c) => c._id);

    return res.status(200).json({ status: "OK", data: { labelList } });
  }

  async updateHotChannel(req, res) {
    // await this.youtubeHandler.updateHotChannel();

    return res.status(200).json({ status: "OK" });
  }

  async getSortChannel(req, res) {
    if (
      !+req.params.pageNumber ||
      ![
        "views",
        "subscribe",
        "numberVideos",
        "gapSubscribes",
        "gapViews",
        "gapNumberVideos",
      ].includes(req.body.type)
    )
      return res
        .status(400)
        .json({ status: "FAIL", msg: "Insufficient parameter" });

    let pageNumber = +req.params.pageNumber;
    let skipDocument = (pageNumber - 1) * 50;
    let channelList: IHotVideo[] = await this.hotChannelService.queryHotChannel(
      [
        { $sort: { [req.body.type]: -1 } },
        { $skip: skipDocument },
        { $limit: 50 },
      ]
    );

    return res.status(200).json({
      status: "OK",
      data: {
        channelList,

        pageNumber,
      },
    });
  }

  async updateHotVideo(req, res) {
    // await this.youtubeHandler.updateHotVideo();
    return res.status(200).json({ status: "OK" });
  }

  async getTotalSortChannels(req, res) {
    const totalChannels = await this.hotChannelService.getTotalHotChannel();
    const totalPage =
      totalChannels % 50 !== 0
        ? Math.ceil(totalChannels / 50)
        : totalChannels / 50;

    return res.status(200).json({
      status: "OK",
      data: {
        totalChannels,
        totalPage,
      },
    });
  }

  async getTotalVideoOfChannel(req, res) {
    const totalVideos = (
      await this.hotVideoService.queryHotVideo([
        {
          $match: {
            "channelInformation.id": req.params.id,
          },
        },
        { $group: { _id: null, count: { $sum: 1 } } },
      ])
    )[0].count;

    const totalPage =
      totalVideos % 50 !== 0 ? Math.ceil(totalVideos / 50) : totalVideos / 50;

    return res.status(200).json({
      status: "OK",
      data: {
        totalVideos,
        totalPage,
      },
    });
  }

  async getChannelInformation(req, res) {
    if (!req.params.id)
      return res
        .status(400)
        .json({ status: "FAIL", msg: "Insufficient parameter" });

    let channelData = await this.hotChannelService.findHotChannel({
      id: req.params.id,
    });

    if (!channelData)
      return res
        .status(404)
        .json({ status: "FAIL", msg: "Insufficient parameter", data: {} });

    let viewsRank = -1;
    let subscribeRank = -1;
    if (channelData.views > 0) {
      let sortViewsChannel = await this.hotChannelService.queryHotChannel([
        { $sort: { views: -1 } },
      ]);
      viewsRank =
        sortViewsChannel.findIndex((c) => c.id === channelData.id) + 1;
    }
    if (channelData.subscribe > 0) {
      let sortSubscribeChannel = await this.hotChannelService.queryHotChannel([
        { $sort: { subscribe: -1 } },
      ]);
      subscribeRank =
        sortSubscribeChannel.findIndex((c) => c.id === channelData.id) + 1;
    }

    return res.status(200).json({
      status: "OK",
      data: {
        channel: { ...channelData, viewsRank, subscribeRank },
      },
    });
  }

  async getChannelOverview(req, res) {
    if (!req.params.id)
      return res
        .status(400)
        .json({ status: "FAIL", msg: "Insufficient parameter" });
    const channelData = await this.hotChannelService.queryHotChannel(
      [
        {
          $setWindowFields: {
            partitionBy: "",
            sortBy: { subscribe: -1 },
            output: {
              rankSubscribe: { $rank: {} },
            },
          },
        },
        {
          $setWindowFields: {
            partitionBy: "",
            sortBy: { views: -1 },
            output: {
              rankVideoViews: { $rank: {} },
            },
          },
        },
        { $match: { id: req.params.id } },
      ],
      { allowDiskUse: true }
    );

    if (channelData.length === 0)
      return res.status(200).json({ status: "OK", data: { isExist: false } });

    let channel: IHotChannel = channelData[0];

    const days =
      (Date.now() - new Date(channel.publishedAt).getTime()) / 86400000;
    const viewsPerDay = Math.trunc(+channel.views / days);
    const subscribePerDay = Math.trunc(+channel.subscribe / days);

    const dataDuration = (
      await this.hotVideoService.queryHotVideo(
        [
          {
            $facet: {
              videos: [
                {
                  $match: {
                    "channelInformation.id": req.params.id,
                  },
                },
                { $group: { _id: null, count: { $sum: 1 } } },
              ],
              totalDuration: [
                {
                  $match: {
                    "channelInformation.id": "UCrmrMEeVpzHfOsc7vqG4xeg",
                  },
                },
                {
                  $group: {
                    _id: "channelInformation.id",
                    totalDuration: { $sum: "$duration" },
                  },
                },
              ],
            },
          },
        ],
        { allowDiskUse: true }
      )
    )[0];

    let totalDuration: number = dataDuration.totalDuration[0].totalDuration;
    let videos: number = dataDuration.videos[0].count;
    const durationPerVideo = Math.trunc(+totalDuration / +videos);
    const uploadPerWeek = (+channel.numberVideos / (days / 7)).toFixed(1);
    const subscribeGrowPer10K = Math.trunc(
      (+channel.subscribe / +channel.views) * 10000
    );

    return res.status(200).json({
      status: "OK",
      data: {
        isExist: true,
        channelOverview: {
          ...channel,
          viewsPerDay,
          subscribePerDay,
          durationPerVideo,
          uploadPerWeek,
          subscribeGrowPer10K,
        },
      },
    });
  }

  async getChannelTags(req, res) {
    if (!req.params.id)
      return res
        .status(400)
        .json({ status: "FAIL", msg: "Insufficient parameter" });
    const tagsList = await this.hotVideoService.queryHotVideo(
      [
        {
          $match: { "channelInformation.id": req.params.id },
        },
        {
          $project: {
            tags: { $size: "$tags" },
          },
        },
      ],
      { allowDiskUse: true }
    );
    if (tagsList.length === 0)
      return res.status(200).json({ status: "OK", data: { isExist: false } });

    return res.status(200).json({
      status: "OK",
      data: {
        tagsList,
      },
    });
  }

  async getVideoViewsDistribution(req, res) {
    if (!req.params.id)
      return res
        .status(400)
        .json({ status: "FAIL", msg: "Insufficient parameter" });

    const query = queryVideoViewDistribution({ id: req.params.id });

    const videoViewsDistribution = (
      await this.hotVideoService.queryHotVideo([query], { allowDiskUse: true })
    )[0];

    for (let i in videoViewsDistribution) {
      videoViewsDistribution[i] =
        videoViewsDistribution[i].length === 0
          ? 0
          : videoViewsDistribution[i][0].count;
    }

    return res.status(200).json({
      status: "OK",
      data: {
        videoViewsDistribution,
      },
    });
  }

  async getChannelVideoList(req, res) {
    if (
      !req.params.id ||
      !["oldest", "gapViews", "views", "newest"].includes(req.body.type) ||
      !+req.params.pageNumber
    )
      return res
        .status(400)
        .json({ status: "FAIL", msg: "Insufficient parameter" });

    let pageNumber = +req.params.pageNumber;
    let skipDocument = (pageNumber - 1) * 50;
    let order =
      ["oldest", "newest"].includes(req.body.type) && req.body.type === "newest"
        ? -1
        : 1;
    const videoList = ["oldest", "newest"].includes(req.body.type)
      ? await this.hotVideoService.queryHotVideo(
          [
            {
              $match: { "channelInformation.id": req.params.id },
            },
            { $sort: { publicAt: order } },
            { $skip: skipDocument },
            { $limit: 50 },
          ],
          { allowDiskUse: true }
        )
      : await this.hotVideoService.queryHotVideo(
          [
            {
              $match: { "channelInformation.id": req.params.id },
            },
            { $sort: { [req.body.type]: -1 } },
            { $skip: skipDocument },
            { $limit: 50 },
          ],
          { allowDiskUse: true }
        );

    if (videoList.length === 0)
      return res.status(200).json({ status: "OK", data: { isExist: false } });

    return res.status(200).json({
      status: "OK",
      data: {
        isExist: true,
        videoList,
      },
    });
  }

  async getVideoDeleted(req, res) {
    if (!req.params.id)
      return res
        .status(400)
        .json({ status: "FAIL", msg: "Insufficient parameter" });

    const videoDeleted: IHotVideo[] = await this.hotVideoService.queryHotVideo([
      {
        $match: {
          $and: [
            { "channelInformation.id": req.params.id },
            { views: { $lt: 0 } },
          ],
        },
      },
    ]);

    return res.status(200).json({
      status: "OK",
      data: {
        videoList: videoDeleted,
      },
    });
  }

  async getChannelUploadStatistic(req, res) {
    let channelUploadStatistics = (
      await this.hotChannelService.queryHotChannel(queryUploadStatistic, {
        allowDiskUse: true,
      })
    )[0];
    let channelUploadAverage = {};
    for (let i in channelUploadStatistics) {
      channelUploadAverage[i] =
        channelUploadStatistics[i]
          .map((c: any) => +c.totalUpload)
          .reduce((a, b) => a + b, 0) /
        channelUploadStatistics[i]
          .map((c: any) => +c.count)
          .reduce((a, b) => a + b, 0);

      channelUploadStatistics[i] = _.chain(channelUploadStatistics[i])
        .keyBy("_id")
        .mapValues("count")
        .value();
    }

    const channelUploadAverageGap = [2, 4, 6, 8, 10, 11];
    for (let i in channelUploadStatistics) {
      let differences = _.difference(
        channelUploadAverageGap,
        Object.keys(channelUploadStatistics[i]).map((v) => +v)
      );
      differences.map((e) => (channelUploadStatistics[i][e] = 0));
    }

    return res.status(200).json({
      status: "OK",
      data: {
        channelUploadStatistics,
        channelUploadAverage,
      },
    });
  }

  async getChannelByUpload(req, res) {
    if (
      !req.body.subscribersGap ||
      !req.body.uploadGap ||
      !Array.isArray(req.body.uploadGap) ||
      !Array.isArray(req.body.subscribersGap)
    )
      return res
        .status(400)
        .json({ status: "FAIL", msg: "Insufficient parameter" });

    const { subscribersGap, uploadGap } = req.body as {
      subscribersGap: number[];
      uploadGap: number[];
    };
    const subscribeCondition =
      subscribersGap.length > 1
        ? [
            { subscribe: { $gte: subscribersGap[0] } },
            { subscribe: { $lt: subscribersGap[1] } },
          ]
        : [{ subscribe: { $gt: subscribersGap[0] } }];

    const uploadGapCondition =
      uploadGap.length > 1
        ? [
            { averageUpload: { $gte: uploadGap[0] } },
            { averageUpload: { $lt: uploadGap[1] } },
          ]
        : [{ averageUpload: { $gt: uploadGap[0] } }];

    const channelList = await this.hotChannelService.queryHotChannel([
      {
        $match: {
          $and: [...subscribeCondition, ...uploadGapCondition],
        },
      },
    ]);

    return res.status(200).json({
      status: "OK",
      data: {
        channelList,
      },
    });
  }

  async getChannelSubscriberStatistic(req, res) {
    const query = queryChannelSubscriberStatistic();
    const channelSubscriber = (
      await this.hotChannelService.queryHotChannel([query], {
        allowDiskUse: true,
      })
    )[0];

    for (let i in channelSubscriber) {
      channelSubscriber[i] =
        channelSubscriber[i].length === 0 ? 0 : channelSubscriber[i][0].count;
    }

    return res.status(200).json({
      status: "OK",
      data: {
        channelSubscriber,
      },
    });
  }

  async getSubscriberAverage(req, res) {
    let averageChannelSubscriber = (
      await this.hotChannelService.queryHotChannel(
        [
          { $match: { subscribe: { $gt: 0 } } },
          { $group: { _id: null, average: { $avg: "$subscribe" } } },
        ],
        { allowDiskUse: true }
      )
    )[0].average;

    return res.status(200).json({
      status: "OK",
      data: {
        averageChannelSubscriber: Math.trunc(averageChannelSubscriber),
      },
    });
  }

  async getChannelBySubscriber(req, res) {
    if (!req.body.subscribeScope || !Array.isArray(req.body.subscribeScope))
      return res
        .status(400)
        .json({ status: "FAIL", msg: "Insufficient parameter" });

    let { subscribeScope } = req.body as { subscribeScope: number[] };
    let channelList = subscribeScope[1]
      ? await this.hotChannelService.queryHotChannel(
          [
            {
              $match: {
                $and: [
                  { subscribe: { $lt: subscribeScope[1] } },
                  { subscribe: { $gte: subscribeScope[0] } },
                ],
              },
            },
            { $sort: { subscribe: -1 } },
            { $limit: 50 },
          ],
          { allowDiskUse: true }
        )
      : await this.hotChannelService.queryHotChannel(
          [
            {
              $match: {
                $and: [{ subscribe: { $gte: subscribeScope[0] } }],
              },
            },
            { $sort: { subscribe: -1 } },
            { $limit: 50 },
          ],
          { allowDiskUse: true }
        );

    return res.status(200).json({
      status: "OK",
      data: {
        channelList,
      },
    });
  }

  async formatDB(req, res) {
    let channelData = (await this.channelService.queryChannel([
      { $skip: 40 },
      { $limit: 5 },
    ])) as IChannel[];

    channelData = channelData.map((c) => {
      let { subscribe, views, numberVideos, date, videoList } = c;
      subscribe = subscribe
        .split("|")
        .slice(0, subscribe.split("|").length - 1)
        .join("|");
      views = views
        .split("|")
        .slice(0, views.split("|").length - 1)
        .join("|");
      numberVideos = numberVideos
        .split("|")
        .slice(0, numberVideos.split("|").length - 1)
        .join("|");
      date = date
        .split("|")
        .slice(0, date.split("|").length - 1)
        .join("|");
      videoList = videoList.map((v) => {
        let { views, likes, dislikes, commentCount, date } = v;
        views = views
          .split("|")
          .slice(0, views.split("|").length - 1)
          .join("|");
        likes = likes
          .split("|")
          .slice(0, likes.split("|").length - 1)
          .join("|");
        dislikes = dislikes
          .split("|")
          .slice(0, dislikes.split("|").length - 1)
          .join("|");
        commentCount = commentCount
          .split("|")
          .slice(0, commentCount.split("|").length - 1)
          .join("|");
        date = date
          .split("|")
          .slice(0, date.split("|").length - 1)
          .join("|");
        return { ...v, views, likes, dislikes, commentCount, date };
      });

      return { ...c, subscribe, views, numberVideos, date, videoList };
    });

    let promise = channelData.map((c) =>
      this.channelService.updateChannel({ id: c.id }, c)
    );

    await Promise.all(promise);
  }
}
