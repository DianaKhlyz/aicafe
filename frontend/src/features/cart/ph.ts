// Класс градиента-плейсхолдера фото по id блюда (до реальных фото из iiko).
export function phClass(id: string): string {
  if (/lager|wheat|ipa|beer/.test(id)) return "ph--beer";
  if (/burger|yard|cheese/.test(id)) return "ph--burger";
  if (/brisket/.test(id)) return "ph--brisket";
  if (/ribs|wings/.test(id)) return "ph--ribs";
  if (/pork/.test(id)) return "ph--pork";
  return "ph--side";
}
