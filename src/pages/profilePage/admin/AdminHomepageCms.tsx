import { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Card,
  Tabs,
  Form,
  Input,
  Button,
  Table,
  Modal,
  Switch,
  Upload,
  Tag,
  Row,
  Col,
  message,
  Popconfirm,
  Tooltip,
  Badge,
  InputNumber,
  Space,
  Empty,
  Typography,
  ConfigProvider,
  Spin,
} from "antd";
import {
  UploadOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SaveOutlined,
  PictureOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  Layers,
  FileText,
  Building,
  Phone,
  Image as ImageIcon,
  Info,
  ExternalLink,
} from "lucide-react";
import { homepageService } from "../../../services/homepageService";
import { academicService } from "../../../services/academicService";
import {
  HomepageData,
  HomepageGalleryItem,
  HomepageMedia,
  HomepageSlide,
  UpdateHomepageSettingsPayload,
} from "../../../types/homepage";
import { Center } from "../../../types/backend";
import { AppImage, useAppImagePreview } from "../../../components/AppImagePreview";
import { resolveMediaUrl } from "../../../services/apiClient";

const { TextArea } = Input;
const { Title, Text } = Typography;

// ── Ant Design theme tương tự Learning CMS ───────────────────
const ANT_THEME = {
  token: {
    borderRadius: 12,
    colorPrimary: "#4f46e5",
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
  },
  components: {
    Table: {
      headerBg: "#f8fafc",
      headerColor: "#475569",
      rowHoverBg: "#f1f5f9",
    },
  },
};

export default function AdminHomepageCms() {
  const location = useLocation();
  const navigate = useNavigate();

  const currentPathInfo = useMemo(() => {
    const pathname = location.pathname;
    let base = "/admin/homepage-cms";
    let sub = "";

    if (pathname.includes("/admin/homepage-cms")) {
      base = "/admin/homepage-cms";
      sub = pathname.split("/admin/homepage-cms")[1] || "";
    } else if (pathname.includes("/admin/homepage")) {
      base = "/admin/homepage";
      sub = pathname.split("/admin/homepage")[1] || "";
    } else if (pathname.includes("/admin/about")) {
      base = "/admin/about";
      sub = pathname.split("/admin/about")[1] || "";
    }

    const parts = sub.split("/").filter(Boolean);
    const tab = parts[0] || "slider";
    const subTab = parts[1] || "info";

    const validTabs = ["slider", "about", "facilities", "footer", "media"];
    const activeTab = validTabs.includes(tab) ? tab : "slider";
    const facilitiesSubTab = subTab === "gallery" ? "gallery" : "info";

    return { base, activeTab, facilitiesSubTab, parts };
  }, [location.pathname]);

  const activeTab = currentPathInfo.activeTab;
  const facilitiesSubTab = currentPathInfo.facilitiesSubTab;

  useEffect(() => {
    if (currentPathInfo.parts.length === 0) {
      navigate(`${currentPathInfo.base}/slider`, { replace: true });
    }
  }, [currentPathInfo.base, currentPathInfo.parts.length, navigate]);

  const handleTabChange = (key: string) => {
    if (key === "facilities") {
      navigate(`${currentPathInfo.base}/facilities/${facilitiesSubTab}`);
    } else {
      navigate(`${currentPathInfo.base}/${key}`);
    }
  };

  const handleFacilitiesSubTabChange = (subTab: "info" | "gallery") => {
    navigate(`${currentPathInfo.base}/facilities/${subTab}`);
  };
  const [loading, setLoading] = useState(false);
  const [homepageData, setHomepageData] = useState<HomepageData | null>(null);
  const [mediaList, setMediaList] = useState<HomepageMedia[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [mediaSearch, setMediaSearch] = useState("");

  // Lightbox preview hook
  const { showPreview, previewElement } = useAppImagePreview();

  // Forms
  const [aboutForm] = Form.useForm();
  const [facilitiesForm] = Form.useForm();
  const [footerForm] = Form.useForm();
  const [slideForm] = Form.useForm();
  const [galleryForm] = Form.useForm();

  // Slide Modal
  const [slideModalVisible, setSlideModalVisible] = useState(false);
  const [editingSlide, setEditingSlide] = useState<HomepageSlide | null>(null);
  const [slideSubmitting, setSlideSubmitting] = useState(false);

  // Gallery Modal
  const [galleryModalVisible, setGalleryModalVisible] = useState(false);
  const [editingGallery, setEditingGallery] = useState<HomepageGalleryItem | null>(null);
  const [gallerySubmitting, setGallerySubmitting] = useState(false);

  // Media Picker Modal
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [mediaPickerCallback, setMediaPickerCallback] = useState<((media: HomepageMedia) => void) | null>(null);

  // Quick Upload in Media tab
  const [mediaUploading, setMediaUploading] = useState(false);
  const [uploadAltText, setUploadAltText] = useState("");
  const [aboutSelectedMedia, setAboutSelectedMedia] = useState<HomepageMedia | null>(null);

  // Live watched media for modals
  const watchedSlideMediaId = Form.useWatch("mediaId", slideForm);
  const watchedGalleryMediaId = Form.useWatch("mediaId", galleryForm);

  const selectedSlideMedia = useMemo(() => {
    return mediaList.find((m) => m.id === watchedSlideMediaId);
  }, [mediaList, watchedSlideMediaId]);

  const selectedGalleryMedia = useMemo(() => {
    return mediaList.find((m) => m.id === watchedGalleryMediaId);
  }, [mediaList, watchedGalleryMediaId]);

  // Load all initial data
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [adminData, media, centerList] = await Promise.all([
        homepageService.getAdmin(),
        homepageService.listMedia().catch(() => []),
        academicService.centers.list().catch(() => []),
      ]);

      setHomepageData(adminData);
      setMediaList(media || []);
      setCenters(centerList || []);

      // Populate About Form
      if (adminData?.about) {
        aboutForm.setFieldsValue({
          aboutTitle: adminData.about.title || "Về Kata Edu",
          aboutDescription: adminData.about.description || "",
          aboutMission: adminData.about.mission || "",
          aboutVision: adminData.about.vision || "",
          aboutStats:
            adminData.about.stats && adminData.about.stats.length > 0
              ? adminData.about.stats
              : [
                { label: "Học viên tin tưởng", value: "10,000+" },
                { label: "Khóa học đa dạng", value: "50+" },
              ],
        });
        if (adminData.about.image) {
          setAboutSelectedMedia({
            id: adminData.about.image.id,
            url: adminData.about.image.url,
            mimeType: adminData.about.image.mimeType || "image/jpeg",
            altText: adminData.about.image.altText,
          });
        } else {
          setAboutSelectedMedia(null);
        }
      }

      // Populate Facilities Form
      if (adminData?.facilities) {
        facilitiesForm.setFieldsValue({
          facilitiesTitle: adminData.facilities.title || "Cơ Sở Vật Chất & Hoạt Động",
          facilitiesDescription: adminData.facilities.description || "",
          facilitiesHighlights:
            adminData.facilities.highlights && adminData.facilities.highlights.length > 0
              ? adminData.facilities.highlights
              : [
                { title: "Phòng học tiêu chuẩn quốc tế", description: "Trang bị máy chiếu, điều hòa và hệ thống âm thanh hiện đại" },
                { title: "Thư viện sách phong phú", description: "Hơn 5,000 đầu sách ngoại ngữ và tài liệu tham khảo" },
                { title: "Khu vực tự học yên tĩnh", description: "Không gian mở kết hợp cà phê sách truyền cảm hứng" },
                { title: "Hoạt động dã ngoại hàng tháng", description: "Phát triển kỹ năng mềm và gắn kết học viên" },
              ],
        });
      }

      // Populate Footer Form
      if (adminData?.footer) {
        footerForm.setFieldsValue({
          footerBrandName: adminData.footer.brandName || "KATA LANGUAGE ACADEMY",
          footerDescription: adminData.footer.description || "",
          footerPhone: adminData.footer.phone || "0123 456 789",
          footerEmail: adminData.footer.email || "contact@kataedu.vn",
          footerCopyright: adminData.footer.copyright || `© ${new Date().getFullYear()} Kata Language Academy. All rights reserved.`,
          footerSocialLinks:
            adminData.footer.socialLinks && adminData.footer.socialLinks.length > 0
              ? adminData.footer.socialLinks
              : [{ platform: "Facebook", url: "https://fb.com/kata" }],
        });
      }
    } catch (error: any) {
      console.error("Failed to load admin homepage data:", error);
      message.error(error.message || "Tải cấu hình trang chủ thất bại");
    } finally {
      setLoading(false);
    }
  };

  // ==================== SLIDES CRUD ====================

  const activeSlideCount = (homepageData?.slider || []).filter((s) => s.isActive).length;

  const handleOpenCreateSlide = () => {
    setEditingSlide(null);
    slideForm.resetFields();
    slideForm.setFieldsValue({
      orderIndex: (homepageData?.slider || []).length,
      isActive: true,
      ctaLabel: "Khám phá ngay",
      ctaLink: "/courses",
    });
    setSlideModalVisible(true);
  };

  const handleOpenEditSlide = (slide: HomepageSlide) => {
    setEditingSlide(slide);
    slideForm.resetFields();
    slideForm.setFieldsValue({
      mediaId: slide.mediaId,
      altText: slide.altText,
      title: slide.title,
      subtitle: slide.subtitle,
      ctaLabel: slide.ctaLabel,
      ctaLink: slide.ctaLink,
      orderIndex: slide.orderIndex,
      isActive: slide.isActive,
    });
    setSlideModalVisible(true);
  };

  const handleSaveSlide = async (values: any) => {
    setSlideSubmitting(true);
    try {
      if (editingSlide) {
        await homepageService.updateSlide(editingSlide.id, values);
        message.success("Cập nhật slide thành công!");
      } else {
        if (values.isActive && activeSlideCount >= 8) {
          message.error("Tối đa 8 banner active. Vui lòng tắt bớt slide khác hoặc đặt trạng thái là ẩn.");
          setSlideSubmitting(false);
          return;
        }
        await homepageService.createSlide(values);
        message.success("Tạo slide mới thành công!");
      }
      setSlideModalVisible(false);
      await loadAllData();
    } catch (err: any) {
      message.error(err.message || "Lưu slide thất bại");
    } finally {
      setSlideSubmitting(false);
    }
  };

  const handleDeleteSlide = async (id: string) => {
    try {
      await homepageService.deleteSlide(id);
      message.success("Đã xóa slide thành công");
      await loadAllData();
    } catch (err: any) {
      message.error(err.message || "Xóa slide thất bại");
    }
  };

  const handleToggleSlideActive = async (slide: HomepageSlide, nextVal: boolean) => {
    if (nextVal && activeSlideCount >= 8 && !slide.isActive) {
      message.warning("Tối đa 8 banner active! Không thể kích hoạt thêm.");
      return;
    }
    try {
      await homepageService.updateSlide(slide.id, { isActive: nextVal });
      message.success(`Đã ${nextVal ? "bật" : "ẩn"} slide`);
      await loadAllData();
    } catch (err: any) {
      message.error(err.message || "Đổi trạng thái thất bại");
    }
  };

  const handleMoveSlide = async (index: number, direction: "up" | "down") => {
    const slides = [...(homepageData?.slider || [])];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= slides.length) return;

    const current = slides[index];
    const target = slides[targetIndex];
    const items = [
      { id: current.id, orderIndex: target.orderIndex },
      { id: target.id, orderIndex: current.orderIndex },
    ];

    try {
      await homepageService.reorderSlides(items);
      message.success("Cập nhật thứ tự slide thành công");
      await loadAllData();
    } catch (err: any) {
      message.error(err.message || "Sắp xếp slide thất bại");
    }
  };

  // ==================== GALLERY CRUD ====================

  const activeGalleryCount = (homepageData?.facilities?.gallery || []).filter((g) => g.isActive).length;

  const handleOpenCreateGallery = () => {
    setEditingGallery(null);
    galleryForm.resetFields();
    galleryForm.setFieldsValue({
      orderIndex: (homepageData?.facilities?.gallery || []).length,
      isActive: true,
    });
    setGalleryModalVisible(true);
  };

  const handleOpenEditGallery = (item: HomepageGalleryItem) => {
    setEditingGallery(item);
    galleryForm.resetFields();
    galleryForm.setFieldsValue({
      mediaId: item.mediaId,
      altText: item.altText,
      orderIndex: item.orderIndex,
      isActive: item.isActive,
    });
    setGalleryModalVisible(true);
  };

  const handleSaveGallery = async (values: any) => {
    setGallerySubmitting(true);
    try {
      if (editingGallery) {
        await homepageService.updateGalleryItem(editingGallery.id, values);
        message.success("Cập nhật ảnh gallery thành công!");
      } else {
        if (values.isActive && activeGalleryCount >= 4) {
          message.error("Tối đa 4 ảnh gallery active. Vui lòng tắt bớt ảnh khác hoặc đặt trạng thái là ẩn.");
          setGallerySubmitting(false);
          return;
        }
        await homepageService.createGalleryItem(values);
        message.success("Thêm ảnh gallery mới thành công!");
      }
      setGalleryModalVisible(false);
      await loadAllData();
    } catch (err: any) {
      message.error(err.message || "Lưu ảnh gallery thất bại");
    } finally {
      setGallerySubmitting(false);
    }
  };

  const handleDeleteGallery = async (id: string) => {
    try {
      await homepageService.deleteGalleryItem(id);
      message.success("Đã xóa ảnh gallery");
      await loadAllData();
    } catch (err: any) {
      message.error(err.message || "Xóa ảnh gallery thất bại");
    }
  };

  const handleToggleGalleryActive = async (item: HomepageGalleryItem, nextVal: boolean) => {
    if (nextVal && activeGalleryCount >= 4 && !item.isActive) {
      message.warning("Tối đa 4 ảnh gallery active! Không thể kích hoạt thêm.");
      return;
    }
    try {
      await homepageService.updateGalleryItem(item.id, { isActive: nextVal });
      message.success(`Đã ${nextVal ? "bật" : "ẩn"} ảnh gallery`);
      await loadAllData();
    } catch (err: any) {
      message.error(err.message || "Đổi trạng thái thất bại");
    }
  };

  const handleMoveGallery = async (index: number, direction: "up" | "down") => {
    const gallery = [...(homepageData?.facilities?.gallery || [])];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= gallery.length) return;

    const current = gallery[index];
    const target = gallery[targetIndex];
    const items = [
      { id: current.id, orderIndex: target.orderIndex },
      { id: target.id, orderIndex: current.orderIndex },
    ];

    try {
      await homepageService.reorderGallery(items);
      message.success("Cập nhật thứ tự gallery thành công");
      await loadAllData();
    } catch (err: any) {
      message.error(err.message || "Sắp xếp gallery thất bại");
    }
  };

  // ==================== SINGLETON SETTINGS ====================

  const handleSaveAbout = async (values: any) => {
    setLoading(true);
    try {
      const payload: UpdateHomepageSettingsPayload = {
        aboutTitle: values.aboutTitle,
        aboutDescription: values.aboutDescription,
        aboutMission: values.aboutMission,
        aboutVision: values.aboutVision,
        aboutStats: values.aboutStats || [],
        aboutMediaId: aboutSelectedMedia ? aboutSelectedMedia.id : null,
      };
      await homepageService.updateSettings(payload);
      message.success("Lưu cấu hình 'Về chúng tôi' thành công!");
      await loadAllData();
    } catch (err: any) {
      message.error(err.message || "Lưu cấu hình About thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFacilities = async (values: any) => {
    setLoading(true);
    try {
      const payload: UpdateHomepageSettingsPayload = {
        facilitiesTitle: values.facilitiesTitle,
        facilitiesDescription: values.facilitiesDescription,
        facilitiesHighlights: values.facilitiesHighlights || [],
      };
      await homepageService.updateSettings(payload);
      message.success("Lưu thông tin Cơ sở vật chất thành công!");
      await loadAllData();
    } catch (err: any) {
      message.error(err.message || "Lưu cấu hình Cơ sở vật chất thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFooter = async (values: any) => {
    setLoading(true);
    try {
      const payload: UpdateHomepageSettingsPayload = {
        footerBrandName: values.footerBrandName,
        footerDescription: values.footerDescription,
        footerPhone: values.footerPhone,
        footerEmail: values.footerEmail,
        footerCopyright: values.footerCopyright,
        footerSocialLinks: values.footerSocialLinks || [],
      };
      await homepageService.updateSettings(payload);
      message.success("Lưu cấu hình Chân trang (Footer) thành công!");
      await loadAllData();
    } catch (err: any) {
      message.error(err.message || "Lưu cấu hình Footer thất bại");
    } finally {
      setLoading(false);
    }
  };

  // ==================== MEDIA MANAGEMENT ====================

  const handleUploadMediaFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      message.error("Vui lòng chỉ tải lên tệp hình ảnh (image/*)!");
      return false;
    }
    setMediaUploading(true);
    try {
      const created = await homepageService.uploadMedia(file, uploadAltText);
      message.success("Tải ảnh lên thư viện thành công!");
      setUploadAltText("");
      await loadAllData();
      return created;
    } catch (err: any) {
      message.error(err.message || "Upload ảnh thất bại");
      return false;
    } finally {
      setMediaUploading(false);
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    try {
      await homepageService.deleteMedia(mediaId);
      message.success("Đã xóa ảnh khỏi thư viện!");
      await loadAllData();
    } catch (err: any) {
      if (err.statusCode === 409 || err.message?.includes("409") || err.message?.includes("tham chiếu")) {
        message.error("Không thể xóa: Ảnh đang được sử dụng ở Slider, About hoặc Gallery!");
      } else {
        message.error(err.message || "Xóa ảnh thất bại");
      }
    }
  };

  const openMediaPicker = (onSelect: (media: HomepageMedia) => void) => {
    setMediaPickerCallback(() => onSelect);
    setMediaPickerOpen(true);
  };

  // Filtered Media list
  const filteredMediaList = useMemo(() => {
    if (!mediaSearch.trim()) return mediaList;
    const q = mediaSearch.toLowerCase();
    return mediaList.filter(
      (m) => (m.altText && m.altText.toLowerCase().includes(q)) || (m.url && m.url.toLowerCase().includes(q))
    );
  }, [mediaList, mediaSearch]);

  // ==================== TAB ITEMS DEFINITION ====================

  const tabItems = [
    // ── TAB 1: HERO SLIDER ──────────────────────────────
    {
      key: "slider",
      label: (
        <span className="flex items-center gap-2 font-semibold">
          <Layers size={16} />
          <span>Hero Slider</span>
          <Badge
            count={`${activeSlideCount}/8`}
            className="ml-1"
            color={activeSlideCount >= 8 ? "#ef4444" : "#4f46e5"}
          />
        </span>
      ),
      children: (
        <div className="space-y-6 pt-2">
          {/* Subheader / Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Banner Slideshow (Hero)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tối đa <strong>8 banner kích hoạt (active)</strong>. Ảnh banner nên có tỉ lệ 16:9 hoặc độ phân giải 1920x800px.
              </p>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenCreateSlide}
              className="bg-indigo-600 hover:bg-indigo-700 h-10 px-5 rounded-xl font-semibold shadow-xs flex items-center gap-2"
            >
              Thêm Slide mới
            </Button>
          </div>

          {/* Slides Table */}
          <Table
            rowKey="id"
            loading={loading}
            dataSource={homepageData?.slider || []}
            pagination={false}
            scroll={{ x: "max-content" }}
            className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs"
            locale={{ emptyText: "Chưa có banner nào. Hãy tạo banner đầu tiên!" }}
            columns={[
              {
                title: "STT",
                width: 70,
                align: "center",
                render: (_: any, __: any, index: number) => (
                  <span className="font-bold text-slate-500">{index + 1}</span>
                ),
              },
              {
                title: "Hình ảnh",
                width: 130,
                render: (_: any, record: HomepageSlide) => (
                  <div className="w-24 h-14 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-2xs">
                    {record.media?.url ? (
                      <AppImage
                        src={record.media.url}
                        alt={record.altText || record.title}
                        className="w-full h-full object-cover"
                        maskText="Xem ảnh"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <PictureOutlined />
                      </div>
                    )}
                  </div>
                ),
              },
              {
                title: "Tiêu đề & Nội dung",
                render: (_: any, record: HomepageSlide) => (
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900 text-sm">{record.title}</div>
                    {record.subtitle && (
                      <div className="text-xs text-slate-500 line-clamp-1">{record.subtitle}</div>
                    )}
                    {record.ctaLabel && (
                      <div className="flex items-center gap-1.5 text-[11px] text-indigo-600 font-medium">
                        <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-md">
                          CTA: {record.ctaLabel} ({record.ctaLink || "/"})
                        </span>
                      </div>
                    )}
                  </div>
                ),
              },
              {
                title: "Thứ tự",
                width: 110,
                align: "center",
                render: (_: any, record: HomepageSlide, index: number) => {
                  const total = (homepageData?.slider || []).length;
                  return (
                    <Space size="small">
                      <Button
                        size="small"
                        icon={<ArrowUpOutlined />}
                        disabled={index === 0}
                        onClick={() => handleMoveSlide(index, "up")}
                        className="rounded-lg"
                      />
                      <Button
                        size="small"
                        icon={<ArrowDownOutlined />}
                        disabled={index === total - 1}
                        onClick={() => handleMoveSlide(index, "down")}
                        className="rounded-lg"
                      />
                    </Space>
                  );
                },
              },
              {
                title: "Trạng thái",
                width: 140,
                render: (_: any, record: HomepageSlide) => (
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={record.isActive}
                      onChange={(checked) => handleToggleSlideActive(record, checked)}
                      size="small"
                    />
                    {record.isActive ? (
                      <Tag color="success" className="border-none rounded-full text-xs font-semibold">
                        Hiển thị
                      </Tag>
                    ) : (
                      <Tag color="default" className="border-none rounded-full text-xs font-semibold">
                        Đang ẩn
                      </Tag>
                    )}
                  </div>
                ),
              },
              {
                title: "Thao tác",
                width: 110,
                align: "right",
                render: (_: any, record: HomepageSlide) => (
                  <Space size="small">
                    <Button
                      type="text"
                      icon={<EditOutlined className="text-indigo-600" />}
                      onClick={() => handleOpenEditSlide(record)}
                      className="rounded-lg"
                    />
                    <Popconfirm
                      title="Xác nhận xóa slide?"
                      description="Slide này sẽ bị gỡ vĩnh viễn khỏi hệ thống."
                      onConfirm={() => handleDeleteSlide(record.id)}
                      okText="Xóa"
                      cancelText="Hủy"
                      okButtonProps={{ danger: true }}
                    >
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        className="rounded-lg"
                      />
                    </Popconfirm>
                  </Space>
                ),
              },
            ]}
          />
        </div>
      ),
    },

    // ── TAB 2: GIỚI THIỆU (ABOUT US) ─────────────────────
    {
      key: "about",
      label: (
        <span className="flex items-center gap-2 font-semibold">
          <FileText size={16} />
          <span>Giới thiệu (About Us)</span>
        </span>
      ),
      children: (
        <div className="space-y-6 pt-2">
          <div className="pb-4 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">Cấu hình Về chúng tôi (About Us)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cập nhật tiêu đề, sứ mệnh, tầm nhìn, ảnh đại diện và các chỉ số nổi bật của trung tâm.
            </p>
          </div>

          <Form
            form={aboutForm}
            layout="vertical"
            onFinish={handleSaveAbout}
            className="space-y-6"
          >
            <Row gutter={24}>
              <Col xs={24} lg={14}>
                <Card className="rounded-2xl border-slate-200/80 shadow-none bg-slate-50/40 p-5 space-y-4">
                  <Form.Item
                    label={<span className="font-semibold text-slate-700">Tiêu đề chính</span>}
                    name="aboutTitle"
                    rules={[{ required: true, message: "Vui lòng nhập tiêu đề" }]}
                  >
                    <Input placeholder="Về Kata Edu" className="rounded-xl h-11" />
                  </Form.Item>

                  <Form.Item
                    label={<span className="font-semibold text-slate-700">Mô tả ngắn (Description)</span>}
                    name="aboutDescription"
                  >
                    <TextArea
                      rows={2}
                      placeholder="Mô tả tóm tắt sứ mệnh và định hướng giáo dục..."
                      className="rounded-xl"
                    />
                  </Form.Item>

                  <Form.Item
                    label={<span className="font-semibold text-slate-700">Sứ mệnh (Mission)</span>}
                    name="aboutMission"
                    rules={[{ required: true, message: "Vui lòng nhập sứ mệnh" }]}
                  >
                    <TextArea
                      rows={4}
                      placeholder="Nhập sứ mệnh của tổ chức..."
                      className="rounded-xl"
                    />
                  </Form.Item>

                  <Form.Item
                    label={<span className="font-semibold text-slate-700">Tầm nhìn (Vision)</span>}
                    name="aboutVision"
                  >
                    <TextArea
                      rows={4}
                      placeholder="Nhập tầm nhìn dài hạn..."
                      className="rounded-xl"
                    />
                  </Form.Item>
                </Card>
              </Col>

              <Col xs={24} lg={10} className="space-y-6">
                {/* Image selector */}
                <Card className="rounded-2xl border-slate-200/80 shadow-none bg-slate-50/40 p-5">
                  <div className="font-semibold text-slate-700 mb-2">Ảnh đại diện About</div>
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center bg-white">
                    {aboutSelectedMedia?.url ? (
                      <div className="space-y-3">
                        <div className="w-full h-44 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-2xs">
                          <AppImage
                            src={aboutSelectedMedia.url}
                            alt="About"
                            className="w-full h-full object-cover"
                            maskText="Xem ảnh lớn"
                          />
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="small"
                            type="dashed"
                            icon={<PictureOutlined />}
                            onClick={() =>
                              openMediaPicker((media) => {
                                setAboutSelectedMedia(media);
                                setMediaPickerOpen(false);
                              })
                            }
                            className="rounded-lg"
                          >
                            Đổi ảnh
                          </Button>
                          <Button
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => setAboutSelectedMedia(null)}
                            className="rounded-lg"
                          >
                            Gỡ ảnh
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="py-6 space-y-3">
                        <ImageIcon size={36} className="mx-auto text-slate-400" />
                        <div className="text-xs text-slate-500">Chưa chọn ảnh đại diện</div>
                        <Button
                          type="dashed"
                          icon={<PictureOutlined />}
                          onClick={() =>
                            openMediaPicker((media) => {
                              setAboutSelectedMedia(media);
                              setMediaPickerOpen(false);
                            })
                          }
                          className="rounded-xl font-medium"
                        >
                          Chọn ảnh từ thư viện
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Stats List Dynamic Form */}
                <Card className="rounded-2xl border-slate-200/80 shadow-none bg-slate-50/40 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-slate-700">Chỉ số Thống kê (Stats)</span>
                  </div>
                  <Form.List name="aboutStats">
                    {(fields, { add, remove }) => (
                      <div className="space-y-3">
                        {fields.map(({ key, name, ...restField }) => (
                          <div
                            key={key}
                            className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs"
                          >
                            <Form.Item
                              {...restField}
                              name={[name, "value"]}
                              rules={[{ required: true, message: "Số liệu" }]}
                              className="!mb-0 flex-1"
                            >
                              <Input placeholder="Ví dụ: 10,000+" className="rounded-lg" />
                            </Form.Item>
                            <Form.Item
                              {...restField}
                              name={[name, "label"]}
                              rules={[{ required: true, message: "Mô tả" }]}
                              className="!mb-0 flex-1"
                            >
                              <Input placeholder="Ví dụ: Học viên tin tưởng" className="rounded-lg" />
                            </Form.Item>
                            <Button
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => remove(name)}
                              className="rounded-lg"
                            />
                          </div>
                        ))}
                        <Button
                          type="dashed"
                          onClick={() => add({ label: "", value: "" })}
                          block
                          icon={<PlusOutlined />}
                          className="rounded-xl mt-2 font-medium"
                        >
                          Thêm chỉ số thống kê
                        </Button>
                      </div>
                    )}
                  </Form.List>
                </Card>
              </Col>
            </Row>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                icon={<SaveOutlined />}
                size="large"
                className="bg-indigo-600 hover:bg-indigo-700 px-8 rounded-xl font-semibold shadow-xs flex items-center gap-2"
              >
                Lưu cấu hình Giới thiệu
              </Button>
            </div>
          </Form>
        </div>
      ),
    },

    // ── TAB 3: CƠ SỞ VẬT CHẤT & GALLERY ─────────────────
    {
      key: "facilities",
      label: (
        <span className="flex items-center gap-2 font-semibold">
          <Building size={16} />
          <span>Cơ sở vật chất &amp; Gallery</span>
          <Badge
            count={`${activeGalleryCount}/4`}
            className="ml-1"
            color={activeGalleryCount >= 4 ? "#ef4444" : "#059669"}
          />
        </span>
      ),
      children: (
        <div className="space-y-6 pt-2">
          {/* Sub-pills Toolbar (như TaxonomyTab trong Learning CMS) */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60 shadow-2xs">
              <button
                type="button"
                onClick={() => handleFacilitiesSubTabChange("info")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${facilitiesSubTab === "info"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                <Building size={14} />
                <span>Thông tin &amp; Điểm nổi bật</span>
              </button>
              <button
                type="button"
                onClick={() => handleFacilitiesSubTabChange("gallery")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${facilitiesSubTab === "gallery"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                <ImageIcon size={14} />
                <span>Bộ sưu tập ảnh Gallery</span>
                <Badge
                  count={`${activeGalleryCount}/4`}
                  color={activeGalleryCount >= 4 ? "#ef4444" : "#059669"}
                  className="scale-90"
                />
              </button>
            </div>

            {facilitiesSubTab === "gallery" && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleOpenCreateGallery}
                className="bg-emerald-600 hover:bg-emerald-700 h-10 px-5 rounded-xl font-semibold shadow-xs flex items-center gap-2"
              >
                Thêm ảnh Gallery
              </Button>
            )}
          </div>

          {/* Sub-tab 1: Thông tin & Điểm nổi bật */}
          {facilitiesSubTab === "info" && (
            <Form
              form={facilitiesForm}
              layout="vertical"
              onFinish={handleSaveFacilities}
              className="space-y-6"
            >
              <Row gutter={24}>
                <Col xs={24} md={12}>
                  <Card className="rounded-2xl border-slate-200/80 shadow-none bg-slate-50/40 p-5 space-y-4">
                    <Form.Item
                      label={<span className="font-semibold text-slate-700">Tiêu đề mục</span>}
                      name="facilitiesTitle"
                      rules={[{ required: true, message: "Vui lòng nhập tiêu đề" }]}
                    >
                      <Input placeholder="Cơ Sở Vật Chất & Hoạt Động" className="rounded-xl h-11" />
                    </Form.Item>

                    <Form.Item
                      label={<span className="font-semibold text-slate-700">Mô tả tổng quát</span>}
                      name="facilitiesDescription"
                    >
                      <TextArea
                        rows={6}
                        placeholder="Mô tả môi trường đào tạo và tiện ích..."
                        className="rounded-xl"
                      />
                    </Form.Item>
                  </Card>
                </Col>

                <Col xs={24} md={12}>
                  <Card className="rounded-2xl border-slate-200/80 shadow-none bg-slate-50/40 p-5">
                    <div className="font-semibold text-slate-700 mb-3">
                      Các điểm nổi bật (Highlights)
                    </div>
                    <Form.List name="facilitiesHighlights">
                      {(fields, { add, remove }) => (
                        <div className="space-y-3">
                          {fields.map(({ key, name, ...restField }) => (
                            <div
                              key={key}
                              className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2 relative"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-600">
                                  Điểm nổi bật #{name + 1}
                                </span>
                                <Button
                                  type="text"
                                  danger
                                  size="small"
                                  icon={<DeleteOutlined />}
                                  onClick={() => remove(name)}
                                  className="rounded-lg"
                                />
                              </div>
                              <Form.Item
                                {...restField}
                                name={[name, "title"]}
                                rules={[{ required: true, message: "Nhập tiêu đề" }]}
                                className="!mb-2"
                              >
                                <Input placeholder="Tiêu đề điểm nhấn..." className="rounded-lg" />
                              </Form.Item>
                              <Form.Item
                                {...restField}
                                name={[name, "description"]}
                                className="!mb-0"
                              >
                                <Input placeholder="Mô tả chi tiết (tùy chọn)..." className="rounded-lg" />
                              </Form.Item>
                            </div>
                          ))}
                          <Button
                            type="dashed"
                            onClick={() => add({ title: "", description: "" })}
                            block
                            icon={<PlusOutlined />}
                            className="rounded-xl mt-2 font-medium"
                          >
                            Thêm điểm nổi bật
                          </Button>
                        </div>
                      )}
                    </Form.List>
                  </Card>
                </Col>
              </Row>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  icon={<SaveOutlined />}
                  size="large"
                  className="bg-indigo-600 hover:bg-indigo-700 px-8 rounded-xl font-semibold shadow-xs flex items-center gap-2"
                >
                  Lưu thông tin Cơ sở vật chất
                </Button>
              </div>
            </Form>
          )}

          {/* Sub-tab 2: Bộ sưu tập ảnh Gallery */}
          {facilitiesSubTab === "gallery" && (
            <div className="space-y-4">
              <div className="bg-emerald-50/60 border border-emerald-100 p-4 rounded-2xl flex items-center gap-3">
                <Info size={18} className="text-emerald-700 shrink-0" />
                <span className="text-xs text-emerald-800 leading-relaxed font-medium">
                  Tối đa <strong>4 ảnh gallery active</strong> được hiển thị đồng thời tại khu vực hình ảnh bên phải trang chủ.
                </span>
              </div>

              <Table
                rowKey="id"
                loading={loading}
                dataSource={homepageData?.facilities?.gallery || []}
                pagination={false}
                scroll={{ x: "max-content" }}
                className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs"
                locale={{ emptyText: "Chưa có ảnh gallery nào." }}
                columns={[
                  {
                    title: "STT",
                    width: 70,
                    align: "center",
                    render: (_: any, __: any, index: number) => (
                      <span className="font-bold text-slate-500">{index + 1}</span>
                    ),
                  },
                  {
                    title: "Hình ảnh",
                    width: 140,
                    render: (_: any, record: HomepageGalleryItem) => (
                      <div className="w-24 h-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-2xs">
                        {record.media?.url ? (
                          <AppImage
                            src={record.media.url}
                            alt={record.altText || "Gallery"}
                            className="w-full h-full object-cover"
                            maskText="Xem ảnh"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <PictureOutlined />
                          </div>
                        )}
                      </div>
                    ),
                  },
                  {
                    title: "Mô tả ảnh (Alt Text)",
                    render: (_: any, record: HomepageGalleryItem) => (
                      <div className="font-medium text-slate-800 text-sm">
                        {record.altText || <span className="text-slate-400 italic">Không có mô tả</span>}
                      </div>
                    ),
                  },
                  {
                    title: "Thứ tự",
                    width: 110,
                    align: "center",
                    render: (_: any, record: HomepageGalleryItem, index: number) => {
                      const total = (homepageData?.facilities?.gallery || []).length;
                      return (
                        <Space size="small">
                          <Button
                            size="small"
                            icon={<ArrowUpOutlined />}
                            disabled={index === 0}
                            onClick={() => handleMoveGallery(index, "up")}
                            className="rounded-lg"
                          />
                          <Button
                            size="small"
                            icon={<ArrowDownOutlined />}
                            disabled={index === total - 1}
                            onClick={() => handleMoveGallery(index, "down")}
                            className="rounded-lg"
                          />
                        </Space>
                      );
                    },
                  },
                  {
                    title: "Trạng thái",
                    width: 140,
                    render: (_: any, record: HomepageGalleryItem) => (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={record.isActive}
                          onChange={(checked) => handleToggleGalleryActive(record, checked)}
                          size="small"
                        />
                        {record.isActive ? (
                          <Tag color="success" className="border-none rounded-full text-xs font-semibold">
                            Hiển thị
                          </Tag>
                        ) : (
                          <Tag color="default" className="border-none rounded-full text-xs font-semibold">
                            Đang ẩn
                          </Tag>
                        )}
                      </div>
                    ),
                  },
                  {
                    title: "Thao tác",
                    width: 110,
                    align: "right",
                    render: (_: any, record: HomepageGalleryItem) => (
                      <Space size="small">
                        <Button
                          type="text"
                          icon={<EditOutlined className="text-indigo-600" />}
                          onClick={() => handleOpenEditGallery(record)}
                          className="rounded-lg"
                        />
                        <Popconfirm
                          title="Xác nhận xóa ảnh gallery này?"
                          onConfirm={() => handleDeleteGallery(record.id)}
                          okText="Xóa"
                          cancelText="Hủy"
                          okButtonProps={{ danger: true }}
                        >
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            className="rounded-lg"
                          />
                        </Popconfirm>
                      </Space>
                    ),
                  },
                ]}
              />
            </div>
          )}
        </div>
      ),
    },

    // ── TAB 4:(FOOTER) ──────────────────────
    {
      key: "footer",
      label: (
        <span className="flex items-center gap-2 font-semibold">
          <Phone size={16} />
          <span>Footer</span>
        </span>
      ),
      children: (
        <div className="space-y-6 pt-2">
          <div className="pb-4 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">Cấu hình Footer</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Hotline &amp; Email dùng chung cho toàn bộ cơ sở. Danh sách tên cơ sở được tự động lấy từ Centers API.
            </p>
          </div>

          <Form
            form={footerForm}
            layout="vertical"
            onFinish={handleSaveFooter}
            className="space-y-6"
          >
            <Row gutter={24}>
              <Col xs={24} lg={14}>
                <Card className="rounded-2xl border-slate-200/80 shadow-none bg-slate-50/40 p-5 space-y-4">
                  <Form.Item
                    label={<span className="font-semibold text-slate-700">Tên thương hiệu</span>}
                    name="footerBrandName"
                    rules={[{ required: true, message: "Vui lòng nhập tên thương hiệu" }]}
                  >
                    <Input placeholder="KATA LANGUAGE ACADEMY" className="rounded-xl h-11" />
                  </Form.Item>

                  <Form.Item
                    label={<span className="font-semibold text-slate-700">Mô tả thương hiệu</span>}
                    name="footerDescription"
                  >
                    <TextArea
                      rows={3}
                      placeholder="Mô tả tóm tắt về sứ mệnh và cam kết chất lượng..."
                      className="rounded-xl"
                    />
                  </Form.Item>

                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        label={<span className="font-semibold text-slate-700">Hotline chung (Phone)</span>}
                        name="footerPhone"
                        rules={[{ required: true, message: "Vui lòng nhập số điện thoại" }]}
                      >
                        <Input placeholder="0123 456 789" className="rounded-xl h-11" />
                      </Form.Item>
                    </Col>

                    <Col xs={24} sm={12}>
                      <Form.Item
                        label={<span className="font-semibold text-slate-700">Email chung</span>}
                        name="footerEmail"
                        rules={[
                          { required: true, message: "Vui lòng nhập email" },
                          { type: "email", message: "Email không đúng định dạng" },
                        ]}
                      >
                        <Input placeholder="contact@kataedu.vn" className="rounded-xl h-11" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item
                    label={<span className="font-semibold text-slate-700">Bản quyền (Copyright)</span>}
                    name="footerCopyright"
                  >
                    <Input
                      placeholder="© 2026 Kata Language Academy. All rights reserved."
                      className="rounded-xl h-11"
                    />
                  </Form.Item>
                </Card>
              </Col>

              <Col xs={24} lg={10} className="space-y-6">
                {/* Social Links List */}
                <Card className="rounded-2xl border-slate-200/80 shadow-none bg-slate-50/40 p-5">
                  <div className="font-semibold text-slate-700 mb-3">
                    Liên kết Mạng xã hội
                  </div>
                  <Form.List name="footerSocialLinks">
                    {(fields, { add, remove }) => (
                      <div className="space-y-3">
                        {fields.map(({ key, name, ...restField }) => (
                          <div
                            key={key}
                            className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs"
                          >
                            <Form.Item
                              {...restField}
                              name={[name, "platform"]}
                              rules={[{ required: true, message: "Tên mạng" }]}
                              className="!mb-0 w-32"
                            >
                              <Input placeholder="Facebook" className="rounded-lg" />
                            </Form.Item>
                            <Form.Item
                              {...restField}
                              name={[name, "url"]}
                              rules={[{ required: true, message: "Đường dẫn" }]}
                              className="!mb-0 flex-1"
                            >
                              <Input placeholder="https://facebook.com/..." className="rounded-lg" />
                            </Form.Item>
                            <Button
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => remove(name)}
                              className="rounded-lg"
                            />
                          </div>
                        ))}
                        <Button
                          type="dashed"
                          onClick={() => add({ platform: "Facebook", url: "" })}
                          block
                          icon={<PlusOutlined />}
                          className="rounded-xl mt-2 font-medium"
                        >
                          Thêm liên kết mạng xã hội
                        </Button>
                      </div>
                    )}
                  </Form.List>
                </Card>

                {/* Note explaining Centers API connection */}
                <Card className="rounded-2xl border-indigo-100 bg-indigo-50/50 p-4">
                  <div className="flex items-start gap-2.5">
                    <Info size={18} className="text-indigo-600 mt-0.5 shrink-0" />
                    <div className="text-xs text-slate-600 leading-relaxed">
                      <strong className="text-indigo-900 block mb-1">
                        Quy ước đồng bộ Cơ sở:
                      </strong>
                      Danh sách cơ sở hiển thị ở Footer được tải tự động từ{" "}
                      <strong>Quản lý trung tâm</strong> ({centers.length} cơ sở đang hoạt động). Địa chỉ và bản đồ chi tiết của từng cơ sở được chỉnh sửa trong trang Quản lý trung tâm.
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                icon={<SaveOutlined />}
                size="large"
                className="bg-indigo-600 hover:bg-indigo-700 px-8 rounded-xl font-semibold shadow-xs flex items-center gap-2"
              >
                Lưu cấu hình Footer
              </Button>
            </div>
          </Form>
        </div>
      ),
    },

    // ── TAB 5: SITE MEDIA LIBRARY ───────────────────────
    {
      key: "media",
      label: (
        <span className="flex items-center gap-2 font-semibold">
          <ImageIcon size={16} />
          <span>Thư viện Site Media</span>
          <Badge count={mediaList.length} color="#d97706" className="ml-1" />
        </span>
      ),
      children: (
        <div className="space-y-6 pt-2">
          {/* Toolbar with Search and Upload */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Thư viện Hình ảnh Trang chủ</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tải lên và quản lý các ảnh dùng cho Slider, About và Gallery. File chỉ nhận định dạng hình ảnh (image/*).
              </p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Input
                placeholder="Tìm kiếm hình ảnh..."
                prefix={<SearchOutlined className="text-slate-400" />}
                value={mediaSearch}
                onChange={(e) => setMediaSearch(e.target.value)}
                allowClear
                className="w-full sm:w-64 rounded-xl"
              />
            </div>
          </div>

          {/* Quick Upload Banner */}
          <div className="bg-slate-50/70 border border-dashed border-slate-300 rounded-3xl p-6 text-center space-y-4 max-w-2xl mx-auto shadow-2xs">
            <div className="space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2 shadow-xs">
                <UploadOutlined className="text-xl" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">Tải ảnh mới lên máy chủ</h4>
              <p className="text-xs text-slate-500">Chấp nhận các file định dạng JPG, PNG, WEBP, GIF (tối đa 10MB)</p>
            </div>

            <div className="max-w-md mx-auto !flex !flex-col !items-center !gap-3.5 pt-1">
              <Input
                placeholder="Nhập mô tả ảnh (Alt Text - tùy chọn)..."
                value={uploadAltText}
                onChange={(e) => setUploadAltText(e.target.value)}
                className="rounded-xl !w-full h-10"
              />
              <Upload
                beforeUpload={(file) => {
                  handleUploadMediaFile(file);
                  return false;
                }}
                showUploadList={false}
                accept="image/*"
                className="!flex !justify-center"
              >
                <Button
                  type="primary"
                  icon={<UploadOutlined />}
                  loading={mediaUploading}
                  className="bg-indigo-600 hover:bg-indigo-700 h-10 px-6 rounded-xl font-semibold shadow-md shadow-indigo-500/20 flex items-center gap-2"
                  style={{ marginTop: 6 }}
                >
                  Chọn tệp ảnh &amp; Tải lên
                </Button>
              </Upload>
            </div>
          </div>

          {/* Media Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-sm">
                Danh sách ảnh trong thư viện ({filteredMediaList.length}
                {mediaSearch ? ` / ${mediaList.length}` : ""})
              </h4>
            </div>

            {filteredMediaList.length === 0 ? (
              <Empty
                description={
                  mediaSearch
                    ? "Không tìm thấy hình ảnh phù hợp từ khóa tìm kiếm."
                    : "Thư viện hiện chưa có ảnh nào."
                }
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredMediaList.map((media) => (
                  <div
                    key={media.id}
                    className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs group hover:shadow-md transition-all relative"
                  >
                    <div className="w-full h-32 bg-slate-100 relative overflow-hidden">
                      <AppImage
                        src={media.url}
                        alt={media.altText || "Media"}
                        className="w-full h-full object-cover"
                        maskText="Phóng to"
                      />
                    </div>
                    <div className="p-2.5 space-y-1">
                      <div
                        className="text-xs font-semibold text-slate-800 truncate"
                        title={media.altText || "Ảnh không tên"}
                      >
                        {media.altText || "Không có Alt text"}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate font-mono">
                        {media.mimeType || "image/jpeg"}
                      </div>
                      <div className="flex items-center justify-end pt-1 border-t border-slate-100">
                        <Popconfirm
                          title="Xác nhận xóa ảnh này?"
                          description="Nếu ảnh đang được sử dụng ở Slider/About/Gallery, hệ thống sẽ từ chối xóa (lỗi 409)."
                          onConfirm={() => handleDeleteMedia(media.id)}
                          okText="Xóa"
                          cancelText="Hủy"
                          okButtonProps={{ danger: true }}
                        >
                          <Button
                            size="small"
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            className="rounded-lg"
                          />
                        </Popconfirm>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ),
    },
  ];

  return (
    <ConfigProvider theme={ANT_THEME}>
      <div className="min-h-screen bg-slate-50/50 py-6 px-4 sm:px-6">
        <Spin spinning={loading} size="large">
          <div className="max-w-[1500px] mx-auto space-y-6">
            {/* ── Page Header Card (Chuẩn Learning CMS) ──────────────── */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm">
              <div className="flex-1 min-w-0">
                <Title level={2} className="!mb-1 !text-slate-900 font-extrabold tracking-tight">
                  Cấu hình Trang chủ (Homepage CMS)
                </Title>
                <Text className="text-slate-500 text-sm leading-relaxed block max-w-3xl">
                  Quản lý toàn diện nội dung hiển thị trên trang chủ Kata Edu: Banner slideshow, Giới thiệu (About Us), Cơ sở vật chất &amp; Hoạt động, Footer và Thư viện hình ảnh.
                </Text>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  icon={<ExternalLink size={15} />}
                  href="/"
                  target="_blank"
                  className="h-10 px-4 rounded-xl font-semibold border-slate-200 hover:border-indigo-500 hover:text-indigo-600 shadow-2xs flex items-center gap-2"
                >
                  Xem trang chủ
                </Button>
              </div>
            </div>

            {/* ── Main Tab Card Container ────────────────────────────── */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              {/* Tabs Size Large */}
              <Tabs
                activeKey={activeTab}
                onChange={handleTabChange}
                size="large"
                items={tabItems}
              />
            </div>

            {/* ── Modals ────────────────────────────────────────────── */}

            {/* MODAL: Thêm/Sửa Slide */}
            <Modal
              open={slideModalVisible}
              title={
                <div className="flex items-center gap-2 text-base font-bold text-slate-800">
                  <PictureOutlined className="text-indigo-600" />
                  {editingSlide ? "Chỉnh sửa Slide Banner" : "Thêm Slide Banner Mới"}
                </div>
              }
              onCancel={() => setSlideModalVisible(false)}
              maskClosable={false}
              destroyOnClose
              className="rounded-2xl overflow-hidden"
              width={840}
              centered
              footer={
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button onClick={() => setSlideModalVisible(false)} className="rounded-xl">
                    Hủy
                  </Button>
                  <Button
                    type="primary"
                    onClick={() => slideForm.submit()}
                    loading={slideSubmitting}
                    className="bg-indigo-600 hover:bg-indigo-700 rounded-xl px-6 font-semibold shadow-sm"
                  >
                    Lưu Slide
                  </Button>
                </div>
              }
            >
              <Form
                form={slideForm}
                layout="vertical"
                onFinish={handleSaveSlide}
                className="max-h-[calc(85vh-130px)] overflow-y-auto pr-1 custom-scrollbar pt-2"
              >
                <Row gutter={24}>
                  {/* CỘT TRÁI: ẢNH BANNER & ALT TEXT */}
                  <Col xs={24} md={10}>
                    <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">
                          Ảnh Banner <span className="text-rose-500">*</span>
                        </span>
                        <Button
                          type="link"
                          size="small"
                          className="p-0 text-xs font-semibold text-indigo-600"
                          onClick={() =>
                            openMediaPicker((media) => {
                              slideForm.setFieldsValue({
                                mediaId: media.id,
                                altText: slideForm.getFieldValue("altText") || media.altText || "",
                              });
                              setMediaPickerOpen(false);
                            })
                          }
                        >
                          {selectedSlideMedia ? "Đổi ảnh khác" : "Chọn từ thư viện"}
                        </Button>
                      </div>

                      {/* Preview Box hoặc Dropzone */}
                      {selectedSlideMedia ? (
                        <div className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-[16/9] bg-slate-900 flex items-center justify-center shadow-sm">
                          <img
                            src={resolveMediaUrl(selectedSlideMedia.url)}
                            alt={selectedSlideMedia.altText || "Banner Preview"}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button
                              size="small"
                              ghost
                              className="rounded-lg text-xs"
                              onClick={() =>
                                openMediaPicker((media) => {
                                  slideForm.setFieldsValue({
                                    mediaId: media.id,
                                    altText: slideForm.getFieldValue("altText") || media.altText || "",
                                  });
                                  setMediaPickerOpen(false);
                                })
                              }
                            >
                              Đổi ảnh
                            </Button>
                            <Button
                              size="small"
                              danger
                              className="rounded-lg text-xs bg-rose-500/90 text-white border-none"
                              onClick={() => slideForm.setFieldValue("mediaId", undefined)}
                            >
                              Gỡ ảnh
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl aspect-[16/9] flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-white transition-colors p-4 text-center"
                          onClick={() =>
                            openMediaPicker((media) => {
                              slideForm.setFieldsValue({
                                mediaId: media.id,
                                altText: slideForm.getFieldValue("altText") || media.altText || "",
                              });
                              setMediaPickerOpen(false);
                            })
                          }
                        >
                          <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg">
                            <PictureOutlined />
                          </div>
                          <span className="text-xs font-semibold text-slate-700">Chọn ảnh Banner</span>
                          <span className="text-[11px] text-slate-400">Khuyến nghị tỉ lệ 16:9</span>
                        </div>
                      )}

                      {/* Form.Item for mediaId validation */}
                      <Form.Item
                        name="mediaId"
                        rules={[{ required: true, message: "Vui lòng chọn ảnh cho banner" }]}
                        className="mb-0"
                      >
                        <Input type="hidden" />
                      </Form.Item>

                      <Form.Item
                        label={<span className="text-xs font-bold text-slate-700">Mô tả ảnh (Alt Text)</span>}
                        name="altText"
                        rules={[{ required: true, message: "Vui lòng nhập mô tả ảnh!" }]}
                        className="mb-0"
                      >
                        <Input placeholder="Ví dụ: Banner khóa học hè Kata Edu" className="rounded-xl text-xs" />
                      </Form.Item>
                    </div>
                  </Col>

                  {/* CỘT PHẢI: NỘI DUNG & THIẾT LẬP */}
                  <Col xs={24} md={14} className="space-y-2">
                    <Form.Item
                      label={<span className="text-xs font-bold text-slate-700">Tiêu đề chính (Title)</span>}
                      name="title"
                      rules={[{ required: true, message: "Vui lòng nhập tiêu đề slide" }]}
                      className="mb-3"
                    >
                      <Input placeholder="Học Tập Sáng Tạo - Tương Lai Rạng Rỡ" className="rounded-xl" />
                    </Form.Item>

                    <Form.Item
                      label={<span className="text-xs font-bold text-slate-700">Phụ đề (Subtitle)</span>}
                      name="subtitle"
                      className="mb-3"
                    >
                      <TextArea rows={2} placeholder="Nội dung mô tả ngắn gọn..." className="rounded-xl" />
                    </Form.Item>

                    <Row gutter={12} className="mb-3">
                      <Col span={12}>
                        <Form.Item
                          label={<span className="text-xs font-bold text-slate-700">Nhãn nút CTA</span>}
                          name="ctaLabel"
                          className="mb-0"
                        >
                          <Input placeholder="Khám phá khóa học" className="rounded-xl" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          label={<span className="text-xs font-bold text-slate-700">Đường dẫn CTA Link</span>}
                          name="ctaLink"
                          className="mb-0"
                        >
                          <Input placeholder="/courses hoặc https://..." className="rounded-xl" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={12}>
                      <Col span={12}>
                        <Form.Item
                          label={<span className="text-xs font-bold text-slate-700">Thứ tự hiển thị</span>}
                          name="orderIndex"
                          className="mb-0"
                        >
                          <InputNumber min={0} className="w-full rounded-xl" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          label={<span className="text-xs font-bold text-slate-700">Trạng thái hiển thị</span>}
                          name="isActive"
                          valuePropName="checked"
                          className="mb-0"
                        >
                          <div className="pt-1">
                            <Switch checkedChildren="Bật" unCheckedChildren="Ẩn" />
                          </div>
                        </Form.Item>
                      </Col>
                    </Row>
                  </Col>
                </Row>
              </Form>
            </Modal>

            {/* MODAL: Thêm/Sửa Gallery Item */}
            <Modal
              open={galleryModalVisible}
              title={
                <div className="flex items-center gap-2 text-base font-bold text-slate-800">
                  <PictureOutlined className="text-emerald-600" />
                  {editingGallery ? "Chỉnh sửa Ảnh Gallery" : "Thêm Ảnh Gallery Mới"}
                </div>
              }
              onCancel={() => setGalleryModalVisible(false)}
              maskClosable={false}
              destroyOnClose
              className="rounded-2xl overflow-hidden"
              width={750}
              centered
              footer={
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button onClick={() => setGalleryModalVisible(false)} className="rounded-xl">
                    Hủy
                  </Button>
                  <Button
                    type="primary"
                    onClick={() => galleryForm.submit()}
                    loading={gallerySubmitting}
                    className="bg-emerald-600 hover:bg-emerald-700 rounded-xl px-6 font-semibold shadow-sm"
                  >
                    Lưu Gallery
                  </Button>
                </div>
              }
            >
              <Form
                form={galleryForm}
                layout="vertical"
                onFinish={handleSaveGallery}
                className="max-h-[calc(85vh-130px)] overflow-y-auto pr-1 custom-scrollbar pt-2"
              >
                <Row gutter={20}>
                  <Col xs={24} md={10}>
                    <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">
                          Ảnh Gallery <span className="text-rose-500">*</span>
                        </span>
                        <Button
                          type="link"
                          size="small"
                          className="p-0 text-xs font-semibold text-emerald-600"
                          onClick={() =>
                            openMediaPicker((media) => {
                              galleryForm.setFieldsValue({
                                mediaId: media.id,
                                altText: galleryForm.getFieldValue("altText") || media.altText || "",
                              });
                              setMediaPickerOpen(false);
                            })
                          }
                        >
                          {selectedGalleryMedia ? "Đổi ảnh khác" : "Chọn từ thư viện"}
                        </Button>
                      </div>

                      {selectedGalleryMedia ? (
                        <div className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-[4/3] bg-slate-900 flex items-center justify-center shadow-sm">
                          <img
                            src={resolveMediaUrl(selectedGalleryMedia.url)}
                            alt={selectedGalleryMedia.altText || "Preview"}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button
                              size="small"
                              ghost
                              className="rounded-lg text-xs"
                              onClick={() =>
                                openMediaPicker((media) => {
                                  galleryForm.setFieldsValue({
                                    mediaId: media.id,
                                    altText: galleryForm.getFieldValue("altText") || media.altText || "",
                                  });
                                  setMediaPickerOpen(false);
                                })
                              }
                            >
                              Đổi ảnh
                            </Button>
                            <Button
                              size="small"
                              danger
                              className="rounded-lg text-xs bg-rose-500/90 text-white border-none"
                              onClick={() => galleryForm.setFieldValue("mediaId", undefined)}
                            >
                              Gỡ ảnh
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="border-2 border-dashed border-slate-200 hover:border-emerald-400 rounded-xl aspect-[4/3] flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-white transition-colors p-4 text-center"
                          onClick={() =>
                            openMediaPicker((media) => {
                              galleryForm.setFieldsValue({
                                mediaId: media.id,
                                altText: galleryForm.getFieldValue("altText") || media.altText || "",
                              });
                              setMediaPickerOpen(false);
                            })
                          }
                        >
                          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">
                            <PictureOutlined />
                          </div>
                          <span className="text-xs font-semibold text-slate-700">Chọn ảnh Gallery</span>
                          <span className="text-[11px] text-slate-400">Khuyến nghị tỉ lệ 4:3</span>
                        </div>
                      )}

                      <Form.Item
                        name="mediaId"
                        rules={[{ required: true, message: "Vui lòng chọn ảnh cho gallery" }]}
                        className="mb-0"
                      >
                        <Input type="hidden" />
                      </Form.Item>
                    </div>
                  </Col>

                  <Col xs={24} md={14} className="space-y-3">
                    <Form.Item
                      label={<span className="text-xs font-bold text-slate-700">Mô tả ảnh (Alt Text)</span>}
                      name="altText"
                      rules={[{ required: true, message: "Vui lòng nhập mô tả ảnh (Alt Text)!" }]}
                      className="mb-3"
                    >
                      <Input placeholder="Hoạt động ngoại khóa..." className="rounded-xl" />
                    </Form.Item>

                    <Row gutter={12}>
                      <Col span={12}>
                        <Form.Item
                          label={<span className="text-xs font-bold text-slate-700">Thứ tự hiển thị</span>}
                          name="orderIndex"
                          className="mb-0"
                        >
                          <InputNumber min={0} className="w-full rounded-xl" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          label={<span className="text-xs font-bold text-slate-700">Trạng thái</span>}
                          name="isActive"
                          valuePropName="checked"
                          className="mb-0"
                        >
                          <div className="pt-1">
                            <Switch checkedChildren="Bật" unCheckedChildren="Ẩn" />
                          </div>
                        </Form.Item>
                      </Col>
                    </Row>
                  </Col>
                </Row>
              </Form>
            </Modal>

            {/* MODAL: Media Picker (Chọn ảnh từ thư viện cho form) */}
            <Modal
              open={mediaPickerOpen}
              title="Chọn ảnh từ Thư viện Site Media"
              onCancel={() => setMediaPickerOpen(false)}
              maskClosable={false}
              footer={null}
              width={750}
              zIndex={1100}
              className="rounded-2xl"
            >
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Nhấp vào một ảnh để chọn cho đối tượng đang cấu hình.
                  </span>
                  <Upload
                    beforeUpload={(file) => {
                      handleUploadMediaFile(file).then((newMedia) => {
                        if (newMedia && mediaPickerCallback) {
                          mediaPickerCallback(newMedia);
                          setMediaPickerOpen(false);
                        }
                      });
                      return false;
                    }}
                    showUploadList={false}
                    accept="image/*"
                  >
                    <Button size="small" type="primary" icon={<UploadOutlined />} loading={mediaUploading} className="bg-indigo-600 rounded-lg font-medium">
                      Tải ảnh mới ngay
                    </Button>
                  </Upload>
                </div>

                {mediaList.length === 0 ? (
                  <Empty description="Chưa có ảnh nào trong thư viện. Hãy tải ảnh lên trước!" />
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[420px] overflow-y-auto p-1">
                    {mediaList.map((media) => (
                      <div
                        key={media.id}
                        onClick={() => {
                          if (mediaPickerCallback) {
                            mediaPickerCallback(media);
                          }
                          setMediaPickerOpen(false);
                        }}
                        className="cursor-pointer border-2 border-slate-200 hover:border-indigo-600 rounded-xl overflow-hidden transition-all group relative bg-slate-50 shadow-2xs"
                      >
                        <img
                          src={resolveMediaUrl(media.url)}
                          alt={media.altText || "Media"}
                          className="w-full h-28 object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="p-1.5 text-[11px] font-medium text-slate-700 truncate bg-white">
                          {media.altText || media.id.slice(0, 8)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Modal>

            {/* LIGHTBOX PREVIEW ELEMENT (Tương tự Learning CMS) */}
            {previewElement}
          </div>
        </Spin>
      </div>
    </ConfigProvider>
  );
}
