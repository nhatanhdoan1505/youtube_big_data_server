import { UserService } from "../models/user/service";
import * as _ from "lodash";
import { HotChannelService } from "../models/channel-hot/service";
import { MainService } from "../utils/MainService";
import { IChannelBaseInformation } from "models/channel/type";
import { ProfileService } from "../utils/ProfileService";
import { IPayment, IUser } from "../models/user/type";

export class UserController {
  private userService: UserService = new UserService();
  private hotChannelService: HotChannelService = new HotChannelService();
  private mainService: MainService = new MainService();
  private profileService: ProfileService = new ProfileService();

  async updateUser(req, res) {
    if (!req.body.user || !req.body.user.uid)
      return res
        .status(400)
        .json({ status: "FAIL", msg: "Insufficient parameter" });

    const { name, photoUrl, uid, email } = req.body.user;

    let user = await this.userService.findUser({ uid });

    if (user) {
      await this.userService.updateUser({ uid }, { photoUrl, name });
      return res.status(200).json({ status: "OK", data: {} });
    }

    await this.userService.createUser({ name, photoUrl, uid, email });
    return res.status(200).json({ status: "OK", data: {} });
  }

  async getUserProfile(req, res) {
    if (!req.user)
      return res
        .status(400)
        .json({ status: "FAIL", msg: "Insufficient parameter" });

    let user: IUser[] = await this.userService.queryUser([
      { $match: { uid: req.user.uid } },
    ]);

    if (user.length === 0)
      return res
        .status(400)
        .json({ status: "FAIL", msg: "Insufficient parameter" });

    let userProfile = user[0];

    let { uid, ...userData } = userProfile;
    const { payment } = userProfile;
    let isPremium = false;
    if (payment.length > 0 && _.last(payment)) {
      let lastPayment: IPayment = _.last(payment);
      let extendDay = lastPayment.title === "MONTHLY" ? 30 : 365;
      let expired = new Date(
        lastPayment.date.getTime() + extendDay * 24 * 60 * 60 * 1000
      );
      isPremium = expired.getTime() >= Date.now() ? true : false;
    }

    return res
      .status(200)
      .json({ status: "OK", data: { userData, isPremium } });
  }

  async updateUserProfile(req, res) {
    if (
      !req.body.channel ||
      (!req.body.competitorChannel && !_.isArray(req.body.competitorChannel))
    )
      return res
        .status(400)
        .json({ status: "FAIL", msg: "Insufficient parameter" });

    let { channel, competitorChannel } = req.body;

    let userChannelData = await this.profileService.getChannelSave(channel);
    let competitorChannelDataPromise = competitorChannel.map((c) =>
      this.profileService.getChannelSave(c.toString())
    );
    let competitorChannelData = (
      await Promise.all(competitorChannelDataPromise)
    ).filter((c) => c);

    await this.userService.updateUser(
      { uid: req.user.uid },
      {
        channel: userChannelData ? userChannelData : req.user.channel,
        competitorChannel: competitorChannelData,
      }
    );
    return res
      .status(200)
      .json({ status: "OK", data: { userChannelData, competitorChannelData } });
  }
}
